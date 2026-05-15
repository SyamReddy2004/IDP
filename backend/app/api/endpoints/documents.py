from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document
import shutil
import os

router = APIRouter()

UPLOAD_DIR = "/app/data/media/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Trigger background task here
    
    return {"message": "File uploaded successfully", "id": document.id}

@router.get("/")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    return docs
