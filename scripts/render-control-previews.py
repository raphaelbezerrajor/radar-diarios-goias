"""Render lightweight source-page previews for DOE, TCM and TCE stories."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "trindade" / "control-news-2026.json"
MANIFEST_PATH = ROOT / "data" / "trindade" / "source-previews.json"
OUTPUT_DIR = ROOT / "public" / "assets" / "sources" / "control"


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def render_page(pdf_path: Path, page_number: int, target: Path) -> dict:
    dependencies = Path(sys.executable).resolve().parents[1]
    pdftoppm = dependencies / "native" / "poppler" / "Library" / "bin" / "pdftoppm.exe"
    if not pdftoppm.exists():
        raise FileNotFoundError(f"pdftoppm not found at {pdftoppm}")
    temporary_root = ROOT.parents[1] / "tmp"
    temporary_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="pauteiro-preview-", dir=temporary_root) as directory:
        prefix = Path(directory) / "page"
        subprocess.run(
            [
                str(pdftoppm), "-f", str(page_number), "-l", str(page_number),
                "-r", "110", "-singlefile", "-png", str(pdf_path), str(prefix),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        with Image.open(prefix.with_suffix(".png")) as rendered:
            image = rendered.convert("RGB")
    if image.width > 1100:
        height = round(image.height * 1100 / image.width)
        image = image.resize((1100, height), Image.Resampling.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    for quality in (72, 64, 56):
        buffer = BytesIO()
        image.save(buffer, "WEBP", quality=quality, method=6)
        value = buffer.getvalue()
        if len(value) < 350_000 or quality == 56:
            target.write_bytes(value)
            return {
                "width": image.width,
                "height": image.height,
                "bytes": len(value),
                "preview_sha256": digest(value),
            }
    raise RuntimeError("preview compression failed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, default=ROOT.parent / "trindade-aberta")
    args = parser.parse_args()
    source_root = args.source_root.resolve()
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    by_record = {item["record_id"]: item for item in manifest.get("items", [])}
    cache: dict[tuple[str, int], dict] = {}
    failures = []

    for item in payload.get("items", []):
        try:
            pdf_path = source_root / item["local_path"]
            contents = pdf_path.read_bytes()
            source_hash = digest(contents)
            if source_hash != item["document_sha256"]:
                raise ValueError("local PDF hash differs from the validated manifest")
            page_number = int(item["page_start"])
            key = (source_hash, page_number)
            preview = cache.get(key)
            if preview is None:
                target = OUTPUT_DIR / f"{source_hash[:18]}-p-{page_number}.webp"
                preview = {
                    "src": f"/assets/sources/control/{target.name}",
                    "page": page_number,
                    **render_page(pdf_path, page_number, target),
                }
                cache[key] = preview
            by_record[item["id"]] = {
                "record_id": item["id"],
                "source_url": item["official_url"],
                "source_sha256": source_hash,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                **preview,
            }
        except Exception as error:
            failures.append({"record_id": item.get("id"), "error": str(error)})

    output = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": "Renderização integral da página oficial em WebP; conteúdo textual não é reescrito.",
        "items": sorted(by_record.values(), key=lambda item: item["record_id"]),
        "failures": failures,
    }
    MANIFEST_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"rendered": len(payload.get("items", [])) - len(failures), "failures": failures}, ensure_ascii=False))


if __name__ == "__main__":
    main()
