"""자소서/이력서 파일(PDF, 이미지, 텍스트) 텍스트 추출

- PDF: 텍스트 레이어가 있으면 pypdf 로 추출, 없으면(스캔본) 페이지 이미지를 OCR 처리
- 이미지: Tesseract OCR (kor+eng). 로컬에 Tesseract 가 설치되어 있어야 하며 TESSERACT_CMD 로 경로 지정 가능
"""
import io
import os
from dataclasses import dataclass

SUPPORTED_TYPES = {
    "application/pdf": "pdf",
    "image/png": "image",
    "image/jpeg": "image",
    "image/webp": "image",
    "text/plain": "text",
}


class OcrError(Exception):
    pass


@dataclass
class OcrResult:
    text: str
    engine: str
    pages: int = 1


def _tesseract():
    try:
        import pytesseract
    except ImportError as exc:
        raise OcrError("pytesseract 가 설치되어 있지 않습니다.") from exc
    cmd = os.getenv("TESSERACT_CMD", "").strip()
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
    return pytesseract


def ocr_image_bytes(data: bytes) -> str:
    from PIL import Image

    pytesseract = _tesseract()
    try:
        image = Image.open(io.BytesIO(data))
        return pytesseract.image_to_string(image, lang="kor+eng")
    except pytesseract.TesseractNotFoundError as exc:
        raise OcrError("Tesseract OCR 엔진을 찾을 수 없습니다. 설치 후 TESSERACT_CMD 를 설정하거나 텍스트로 붙여 넣어 주세요.") from exc


def extract_pdf(data: bytes) -> OcrResult:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        raise OcrError("PDF 파일을 읽을 수 없습니다.") from exc
    texts = [(page.extract_text() or "") for page in reader.pages]
    text = "\n".join(texts).strip()
    if len(text) >= 30:
        return OcrResult(text, "pdf-text", len(reader.pages))
    images = [img.data for page in reader.pages for img in getattr(page, "images", [])]
    if not images:
        raise OcrError("PDF 에서 텍스트를 찾지 못했습니다.")
    return OcrResult("\n".join(ocr_image_bytes(img) for img in images).strip(), "tesseract", len(reader.pages))


def extract_text(data: bytes, content_type: str, filename: str = "") -> OcrResult:
    kind = SUPPORTED_TYPES.get(content_type)
    if not kind and filename.lower().endswith(".txt"):
        kind = "text"
    if kind == "pdf":
        return extract_pdf(data)
    if kind == "image":
        return OcrResult(ocr_image_bytes(data).strip(), "tesseract")
    if kind == "text":
        for encoding in ("utf-8-sig", "cp949"):
            try:
                return OcrResult(data.decode(encoding).strip(), "plain-text")
            except UnicodeDecodeError:
                continue
        raise OcrError("텍스트 파일 인코딩을 인식할 수 없습니다. UTF-8 로 저장해 주세요.")
    raise OcrError("지원하지 않는 파일 형식입니다. (PDF, PNG, JPG, WEBP, TXT)")
