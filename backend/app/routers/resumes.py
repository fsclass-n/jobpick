"""자소서·이력서 관리 (/api/resumes)"""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from rpa.ocr import SUPPORTED_TYPES, OcrError, extract_text

from ..config import ROOT_DIR, settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Resume, ResumeVersion, User
from ..schemas import OcrOut, ResumeDetail, ResumeIn, ResumeOut
from ..services.resume_parser import parse_resume_text

router = APIRouter(prefix="/api/resumes", tags=["resumes"])
MAX_UPLOAD = 10 * 1024 * 1024
UPLOAD_EXT = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt"}


def get_owned(db: Session, resume_id: int, user: User) -> Resume:
    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "자소서를 찾을 수 없습니다.")
    return resume


def snapshot(resume: Resume) -> ResumeVersion:
    return ResumeVersion(version=resume.version, title=resume.title, items=resume.items)


@router.get("", response_model=list[ResumeOut])
def list_resumes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(select(Resume).where(Resume.user_id == user.id).order_by(Resume.updated_at.desc())).all()


@router.post("", response_model=ResumeDetail, status_code=status.HTTP_201_CREATED)
def create_resume(body: ResumeIn, source_type: str = "text", file_token: str | None = None,
                  db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    resume = Resume(user_id=user.id, title=body.title, target_job=body.target_job,
                    items=[i.model_dump() for i in body.items], version=1,
                    source_type=source_type if source_type in ("text", "upload") else "text",
                    file_path=_resolve_upload(file_token, user))
    resume.versions.append(snapshot(resume))
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeDetail)
def get_resume(resume_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned(db, resume_id, user)


@router.put("/{resume_id}", response_model=ResumeDetail)
def update_resume(resume_id: int, body: ResumeIn, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    """수정할 때마다 버전을 올리고 이전 내용은 버전 이력으로 보관"""
    resume = get_owned(db, resume_id, user)
    items = [i.model_dump() for i in body.items]
    if items == resume.items and body.title == resume.title and body.target_job == resume.target_job:
        return resume
    resume.title, resume.target_job, resume.items = body.title, body.target_job, items
    resume.version += 1
    resume.versions.append(snapshot(resume))
    db.commit()
    db.refresh(resume)
    return resume


@router.post("/{resume_id}/restore/{version}", response_model=ResumeDetail)
def restore_version(resume_id: int, version: int, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    resume = get_owned(db, resume_id, user)
    target = next((v for v in resume.versions if v.version == version), None)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "해당 버전이 없습니다.")
    resume.title, resume.items = target.title, list(target.items)
    resume.version += 1
    resume.versions.append(snapshot(resume))
    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(resume_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    resume = get_owned(db, resume_id, user)
    if resume.file_path:
        (ROOT_DIR / resume.file_path).unlink(missing_ok=True)
    db.delete(resume)
    db.commit()


def _upload_dir(user: User) -> Path:
    base = settings.storage_dir if settings.storage_dir.is_absolute() else ROOT_DIR / settings.storage_dir
    path = base / "uploads" / str(user.id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _resolve_upload(file_token: str | None, user: User) -> str | None:
    if not file_token:
        return None
    name = Path(file_token).name
    path = _upload_dir(user) / name
    return path.relative_to(ROOT_DIR).as_posix() if path.exists() and path.is_relative_to(ROOT_DIR) else None


@router.post("/ocr", response_model=OcrOut)
async def ocr_upload(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """PDF/이미지/텍스트 파일에서 자소서 텍스트를 추출하고 문항 단위로 분리"""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in UPLOAD_EXT or (file.content_type not in SUPPORTED_TYPES and ext != ".txt"):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "PDF, PNG, JPG, WEBP, TXT 파일만 업로드할 수 있습니다.")
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "파일은 10MB 이하만 업로드할 수 있습니다.")
    try:
        result = extract_text(data, file.content_type or "", file.filename or "")
    except OcrError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    if not result.text.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "파일에서 텍스트를 찾지 못했습니다.")
    token = f"{uuid.uuid4().hex}{ext}"
    (_upload_dir(user) / token).write_bytes(data)
    items = parse_resume_text(result.text)
    return {"text": result.text, "items": items, "engine": result.engine, "pages": result.pages,
            "file_token": token}
