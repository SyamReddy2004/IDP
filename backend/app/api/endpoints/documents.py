from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document, DocumentStatus
from app.core.config import settings
import shutil
import os
import pdfplumber
import uuid
import json
import re
import base64
import urllib.request

router = APIRouter()

UPLOAD_DIR = "./data/media/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Singleton cache for local offline mode ───────────────────
_paddle_ocr = None
def get_paddle_ocr():
    global _paddle_ocr
    if _paddle_ocr is None:
        try:
            from paddleocr import PaddleOCR
            _paddle_ocr = PaddleOCR(lang='en')
        except ImportError:
            raise ImportError("paddleocr is not installed")
    return _paddle_ocr


def extract_text(file_path: str, filename: str):
    """Extract raw text. Returns (text: str, ocr_confidence: float)."""
    ext = filename.lower().rsplit('.', 1)[-1]

    if ext == 'pdf':
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
        except Exception as e:
            print(f"PDF extract error: {e}")
        return text, 1.0

    elif ext == 'docx':
        try:
            from docx import Document as DocxDoc
            doc = DocxDoc(file_path)
            text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            return text, 1.0
        except Exception as e:
            print(f"DOCX extract error: {e}")
            return "", 0.0

    elif ext in ('jpg', 'jpeg', 'png'):
        try:
            ocr = get_paddle_ocr()
            result = ocr.predict(file_path)
            lines, scores = [], []
            for page in result:
                for text, score in zip(
                    page.get('rec_texts', []),
                    page.get('rec_scores', [])
                ):
                    if text.strip():
                        lines.append(text)
                        scores.append(float(score))
            avg_score = round(sum(scores) / len(scores), 3) if scores else 0.0
            return " ".join(lines), avg_score
        except ImportError:
            print("PaddleOCR not installed locally.")
            return f"[Offline Image: {filename}] — Please install paddleocr and paddlepaddle locally to perform offline image OCR.", 0.0
        except Exception as e:
            print(f"Local OCR error: {e}")
            return f"[Image: {filename}]", 0.0

    return "", 0.0


def run_gemini_multimodal_extraction(file_path: str, filename: str, api_key: str) -> list:
    """Send image directly to Gemini API for multimodal extraction (No local OCR required)."""
    try:
        with open(file_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
            
        ext = filename.lower().rsplit('.', 1)[-1]
        mime_type = "image/png" if ext == "png" else "image/jpeg"

        prompt = (
            'Analyze this document image. Return ONLY a JSON object with these keys:\n'
            '"summary": one sentence summary of the image content.\n'
            '"entities": list of {"field":"...","extractedValue":"..."} objects.\n'
            '"tables": list of {"row":N,"data":"col1: val | col2: val"} if tables exist, else [].\n'
            'No markdown. JSON only.'
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = json.dumps({
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": image_data
                        }
                    }
                ]
            }]
        }).encode('utf-8')

        req = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            response_data = json.loads(resp.read().decode('utf-8'))
            raw_response = response_data['candidates'][0]['content']['parts'][0]['text']
            
            json_match = re.search(r'\{[\s\S]*\}', raw_response)
            if not json_match:
                raise ValueError("No JSON found in Gemini multimodal response")
            parsed = json.loads(json_match.group(0))

            results = []
            overall_confidence = 0.99

            summary = parsed.get("summary", "")
            if summary:
                results.append({
                    "id": str(uuid.uuid4()),
                    "field": "📄 Document Summary",
                    "extractedValue": summary,
                    "confidence": overall_confidence,
                    "type": "summary"
                })

            for item in parsed.get("entities", []):
                if isinstance(item, dict):
                    norm = {k.lower(): v for k, v in item.items()}
                    field = norm.get("field", "")
                    value = norm.get("extractedvalue", norm.get("value", ""))
                    if field and value:
                        results.append({
                            "id": str(uuid.uuid4()),
                            "field": str(field),
                            "extractedValue": str(value),
                            "confidence": overall_confidence,
                            "type": "entity"
                        })

            for row in parsed.get("tables", []):
                if isinstance(row, dict):
                    results.append({
                        "id": str(uuid.uuid4()),
                        "field": f"🗂 Table Row {row.get('row', '')}",
                        "extractedValue": str(row.get("data", "")),
                        "confidence": overall_confidence,
                        "type": "table"
                    })

            if results:
                results[0]["overall_confidence"] = overall_confidence
                return results

    except Exception as e:
        print(f"Gemini Multimodal API error: {e}")
    return []


def run_gemini_extraction(text: str, ocr_confidence: float, api_key: str) -> list:
    snippet = text[:3500]
    prompt = (
        'Analyze this document. Return ONLY a JSON object with these keys:\n'
        '"summary": one sentence summary.\n'
        '"entities": list of {"field":"...","extractedValue":"..."} objects.\n'
        '"tables": list of {"row":N,"data":"col1: val | col2: val"} if tables exist, else [].\n'
        'No markdown. JSON only.\n\nDocument:\n' + snippet
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }).encode('utf-8')

    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            response_data = json.loads(resp.read().decode('utf-8'))
            raw_response = response_data['candidates'][0]['content']['parts'][0]['text']
            
            json_match = re.search(r'\{[\s\S]*\}', raw_response)
            if not json_match:
                raise ValueError("No JSON found in Gemini response")
            parsed = json.loads(json_match.group(0))

            results = []
            lm_confidence = 0.98
            overall_confidence = round((ocr_confidence + lm_confidence) / 2, 2)

            summary = parsed.get("summary", "")
            if summary:
                results.append({
                    "id": str(uuid.uuid4()),
                    "field": "📄 Document Summary",
                    "extractedValue": summary,
                    "confidence": overall_confidence,
                    "type": "summary"
                })

            for item in parsed.get("entities", []):
                if isinstance(item, dict):
                    norm = {k.lower(): v for k, v in item.items()}
                    field = norm.get("field", "")
                    value = norm.get("extractedvalue", norm.get("value", ""))
                    if field and value:
                        results.append({
                            "id": str(uuid.uuid4()),
                            "field": str(field),
                            "extractedValue": str(value),
                            "confidence": overall_confidence,
                            "type": "entity"
                        })

            for row in parsed.get("tables", []):
                if isinstance(row, dict):
                    results.append({
                        "id": str(uuid.uuid4()),
                        "field": f"🗂 Table Row {row.get('row', '')}",
                        "extractedValue": str(row.get("data", "")),
                        "confidence": overall_confidence,
                        "type": "table"
                    })

            if results:
                results[0]["overall_confidence"] = overall_confidence
                return results

    except Exception as e:
        print(f"Gemini API error: {e}")
    return []


def run_ollama_extraction(text: str, ocr_confidence: float) -> list:
    if settings.GEMINI_API_KEY:
        print("Using Gemini API for document extraction...")
        gemini_results = run_gemini_extraction(text, ocr_confidence, settings.GEMINI_API_KEY)
        if gemini_results:
            return gemini_results
        print("Gemini failed or returned empty. Falling back to local Ollama...")

    snippet = text[:2000]
    prompt = (
        'Analyze this document. Return ONLY a JSON object with these keys:\n'
        '"summary": one sentence summary.\n'
        '"entities": list of {{"field":"...","extractedValue":"..."}} objects.\n'
        '"tables": list of {{"row":N,"data":"col1: val | col2: val"}} if tables exist, else [].\n'
        'No markdown. JSON only.\n\nDocument:\n' + snippet
    )

    try:
        payload = json.dumps({
            "model": "llama3",
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 512,
                "temperature": 0
            }
        }).encode('utf-8')

        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/generate",
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw_response = json.loads(resp.read().decode('utf-8')).get("response", "")
            print(f"Ollama raw (first 200): {raw_response[:200]}")

            json_match = re.search(r'\{[\s\S]*\}', raw_response)
            if not json_match:
                raise ValueError("No JSON found in Ollama response")
            parsed = json.loads(json_match.group(0))

            results = []
            lm_confidence = 0.93
            overall_confidence = round((ocr_confidence + lm_confidence) / 2, 2)

            summary = parsed.get("summary", "")
            if summary:
                results.append({
                    "id": str(uuid.uuid4()),
                    "field": "📄 Document Summary",
                    "extractedValue": summary,
                    "confidence": overall_confidence,
                    "type": "summary"
                })

            for item in parsed.get("entities", []):
                if isinstance(item, dict):
                    norm = {k.lower(): v for k, v in item.items()}
                    field = norm.get("field", "")
                    value = norm.get("extractedvalue", norm.get("value", ""))
                    if field and value:
                        results.append({
                            "id": str(uuid.uuid4()),
                            "field": str(field),
                            "extractedValue": str(value),
                            "confidence": overall_confidence,
                            "type": "entity"
                        })

            for row in parsed.get("tables", []):
                if isinstance(row, dict):
                    results.append({
                        "id": str(uuid.uuid4()),
                        "field": f"🗂 Table Row {row.get('row', '')}",
                        "extractedValue": str(row.get("data", "")),
                        "confidence": overall_confidence,
                        "type": "table"
                    })

            if results:
                results[0]["overall_confidence"] = overall_confidence
                return results

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
    except Exception as e:
        print(f"Ollama error: {e}")

    return [
        {"id": str(uuid.uuid4()), "field": "Status",
         "extractedValue": "Ollama Not Running — open a terminal and run: ollama run llama3",
         "confidence": 0.0, "type": "error", "overall_confidence": 0.0},
        {"id": str(uuid.uuid4()), "field": "Extracted Text Length",
         "extractedValue": f"{len(text)} chars extracted", "confidence": 0.0, "type": "info"}
    ]


@router.post("/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    document = Document(
        filename=file.filename,
        file_path=file_path,
        content_type=file.content_type
    )

    ext = file.filename.lower().rsplit('.', 1)[-1]
    
    # Cloud-safe shortcut: Use Gemini Multimodal directly for image files if key is set
    if ext in ('jpg', 'jpeg', 'png') and settings.GEMINI_API_KEY:
        print("Using Gemini Multimodal API directly for image...")
        extracted_data = run_gemini_multimodal_extraction(file_path, file.filename, settings.GEMINI_API_KEY)
        if extracted_data:
            document.extracted_data = extracted_data
        else:
            document.extracted_data = [
                {"id": str(uuid.uuid4()), "field": "Error",
                 "extractedValue": "Gemini multimodal extraction failed.",
                 "confidence": 0.0, "type": "error", "overall_confidence": 0.0}
            ]
    else:
        raw_text, ocr_confidence = extract_text(file_path, file.filename)

        if raw_text.strip():
            document.extracted_data = run_ollama_extraction(raw_text, ocr_confidence)
        else:
            document.extracted_data = [
                {"id": str(uuid.uuid4()), "field": "Notice",
                 "extractedValue": "Could not extract text from this file.",
                 "confidence": 0.0, "type": "error", "overall_confidence": 0.0}
            ]

    document.status = "COMPLETED"
    db.add(document)
    db.commit()
    db.refresh(document)
    return {"message": "File uploaded successfully", "id": document.id}


@router.post("/{document_id}/approve")
def approve_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = DocumentStatus.APPROVED
    db.commit()
    return {"message": "Document approved", "id": document_id, "status": "APPROVED"}


@router.get("/{document_id}")
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.upload_time.desc()).all()
    return docs
