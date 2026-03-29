from __future__ import annotations

import json
import mimetypes
import zipfile
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - fallback when pypdf is unavailable
    PdfReader = None


@dataclass
class UploadEntry:
    relativePath: str
    category: str
    fileName: str
    extension: str
    mimeType: str
    sizeBytes: int
    modifiedAt: str
    summary: str


PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOADS_DIR = PROJECT_ROOT / "uploads"
OUTPUT_PATH = PROJECT_ROOT / "data" / "upload-analysis.json"


def iso_timestamp(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).astimezone().isoformat()


def summarize_pdf(path: Path) -> str:
    if PdfReader is None:
        return "PDF found. Install pypdf to extract a preview automatically."

    try:
        reader = PdfReader(str(path))
        page_count = len(reader.pages)
        first_page = (reader.pages[0].extract_text() or "").strip().replace("\n", " ")
        preview = " ".join(first_page.split())[:220]
        if preview:
          return f"PDF with {page_count} page(s). Preview: {preview}"
        return f"PDF with {page_count} page(s). No text preview was extracted."
    except Exception as exc:  # pragma: no cover - defensive fallback
        return f"PDF found, but preview extraction failed: {exc}"


def summarize_image(path: Path) -> str:
    return "Image found. Ready for future vision or OCR analysis."


def summarize_docx(path: Path) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            with archive.open("word/document.xml") as document_xml:
                tree = ET.parse(document_xml)

        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        text_parts = [node.text.strip() for node in tree.findall(".//w:t", namespace) if node.text and node.text.strip()]
        preview = " ".join(text_parts)
        preview = " ".join(preview.split())[:220]
        if preview:
            return f"DOCX document. Preview: {preview}"
        return "DOCX document found. No text preview was extracted."
    except Exception as exc:  # pragma: no cover - defensive fallback
        return f"DOCX found, but preview extraction failed: {exc}"


def summarize_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return summarize_pdf(path)
    if suffix == ".docx":
        return summarize_docx(path)
    if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
        return summarize_image(path)
    return "File found. No specialized analysis has been added for this type yet."


def category_for(path: Path) -> str:
    try:
        return path.relative_to(UPLOADS_DIR).parts[0]
    except Exception:
        return "other"


def build_entry(path: Path) -> UploadEntry:
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return UploadEntry(
        relativePath=str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        category=category_for(path),
        fileName=path.name,
        extension=path.suffix.lower(),
        mimeType=mime_type,
        sizeBytes=path.stat().st_size,
        modifiedAt=iso_timestamp(path),
        summary=summarize_file(path),
    )


def main() -> None:
    files = sorted([path for path in UPLOADS_DIR.rglob("*") if path.is_file()])
    entries = [asdict(build_entry(path)) for path in files]

    analysis = {
        "generatedAt": datetime.now().astimezone().isoformat(),
        "root": str(UPLOADS_DIR),
        "totalFiles": len(entries),
        "categories": {
            "docs": sum(1 for item in entries if item["category"] == "docs"),
            "mistakes": sum(1 for item in entries if item["category"] == "mistakes"),
            "timetable": sum(1 for item in entries if item["category"] == "timetable"),
        },
        "items": entries,
        "notes": [
            "This report is generated locally from the uploads folder.",
            "It is meant to help future Codex prompts quickly see what files were added.",
            "PDF previews use pypdf when text can be extracted from the file.",
            "DOCX previews are extracted directly from the Word document XML."
        ]
    }

    OUTPUT_PATH.write_text(json.dumps(analysis, indent=2), encoding="utf-8")
    print(f"Analyzed {len(entries)} upload file(s).")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
