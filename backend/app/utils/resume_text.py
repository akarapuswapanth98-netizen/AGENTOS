"""Resume upload validation + text extraction. Files stay in memory, never on disk."""
import io

from fastapi import HTTPException, UploadFile

MAX_BYTES = 2 * 1024 * 1024
MAX_CHARS = 15000
ALLOWED_SUFFIXES = (".pdf", ".txt")


async def extract_resume_text(upload: UploadFile) -> str:
    """Validate an uploaded resume and return its text (capped, in memory)."""
    name = (upload.filename or "").lower()
    if not name.endswith(ALLOWED_SUFFIXES):
        raise HTTPException(status_code=415, detail="Only .pdf and .txt resumes are accepted")
    raw = await upload.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Resume is larger than the 2 MB limit")
    if not raw.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if name.endswith(".pdf"):
        if not raw.startswith(b"%PDF"):
            raise HTTPException(status_code=415, detail="File claims to be a PDF but is not one")
        text = _extract_pdf(raw)
    else:
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Text file is not valid UTF-8") from None
    if not text.strip():
        raise HTTPException(status_code=400, detail="No extractable text found in the resume")
    return text[:MAX_CHARS]


def _extract_pdf(raw: bytes) -> str:
    """Pull text from every PDF page; empty string when nothing is readable."""
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(raw))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this PDF file") from None
    parts = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(parts)
