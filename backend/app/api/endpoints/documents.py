from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document, DocumentStatus
import shutil
import os
import pdfplumber
import uuid
import json
import re
import urllib.request

router = APIRouter()

UPLOAD_DIR = "./data/media/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Singleton cache ─────────────────────────────────────────
_paddle_ocr = None
def get_paddle_ocr():
    global _paddle_ocr
    if _paddle_ocr is None:
        from paddleocr import PaddleOCR
        _paddle_ocr = PaddleOCR(lang='en')
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
        return text, 1.0  # pdfplumber is deterministic — full confidence

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
            ocr = get_paddle_ocr()  # Reuse cached instance
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
        except Exception as e:
            print(f"PaddleOCR error: {e}")
            return f"[Image: {filename}]", 0.0

    return "", 0.0


def run_ollama_extraction(text: str, ocr_confidence: float) -> list:
    # Only send first 2000 chars for speed
    snippet = text[:2000]

    # Short, direct prompt — fewer tokens = faster response
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
                "num_predict": 512,   # Cap response length for speed
                "temperature": 0      # Deterministic = faster
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

            # Extract JSON blob from response
            json_match = re.search(r'\{[\s\S]*\}', raw_response)
            if not json_match:
                raise ValueError("No JSON found in Ollama response")
            parsed = json.loads(json_match.group(0))

            results = []

            # Overall confidence (OCR accuracy + LLM extraction quality average)
            lm_confidence = 0.93  # LLM extraction assumed high for structured docs
            overall_confidence = round((ocr_confidence + lm_confidence) / 2, 2)

            # Summary row
            summary = parsed.get("summary", "")
            if summary:
                results.append({
                    "id": str(uuid.uuid4()),
                    "field": "📄 Document Summary",
                    "extractedValue": summary,
                    "confidence": overall_confidence,
                    "type": "summary"
                })

            # Entities
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

            # Table rows
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
                # Inject overall_confidence as metadata in first item
                results[0]["overall_confidence"] = overall_confidence
                return results

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
    except Exception as e:
        print(f"Ollama error: {e}")

    # Fallback
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
