"""Renderiza páginas-fonte das matérias automáticas de julho em WebP leve."""

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
JULY_PATH = ROOT / "data" / "trindade" / "july-document-news-2026.json"
MANIFEST_PATH = ROOT / "data" / "trindade" / "source-previews.json"
OUTPUT_DIR = ROOT / "public" / "assets" / "sources" / "july"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def build_edition_map(source_root: Path) -> dict[str, dict]:
    municipal = load_json(source_root / "data" / "public" / "municipal-diaries-2026.json")
    alego = load_json(source_root / "data" / "public" / "alego-diaries-2026.json")
    editions: dict[str, dict] = {}
    for source in municipal.get("sources", []):
        for edition in source.get("editions", []):
            editions[edition["id"]] = edition
    for edition in alego.get("editions", []):
        editions[edition["id"]] = edition
    return editions


def render_page(pdf_path: Path, page_number: int, target: Path) -> tuple[int, int, str, int]:
    dependencies = Path(sys.executable).resolve().parents[1]
    pdftoppm = dependencies / "native" / "poppler" / "Library" / "bin" / "pdftoppm.exe"
    if not pdftoppm.exists():
        raise FileNotFoundError(f"pdftoppm não encontrado em {pdftoppm}")
    with tempfile.TemporaryDirectory(prefix="pauteiro-july-preview-") as directory:
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
        contents = buffer.getvalue()
        if len(contents) < 350_000 or quality == 56:
            target.write_bytes(contents)
            return image.width, image.height, sha256_bytes(contents), len(contents)
    raise RuntimeError("não foi possível comprimir a prévia")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, default=ROOT.parent / "trindade-aberta")
    parser.add_argument("--limit", type=int, default=24)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--record-id", action="append", default=[])
    args = parser.parse_args()

    source_root = args.source_root.resolve()
    payload = load_json(JULY_PATH)
    editions = build_edition_map(source_root)
    manifest = load_json(MANIFEST_PATH) if MANIFEST_PATH.exists() else {"schema_version": 1, "items": [], "failures": []}
    by_record = {item["record_id"]: item for item in manifest.get("items", [])}

    selected_ids = set(args.record_id)
    candidates = sorted(
        (
            item
            for item in payload.get("items", [])
            if (item.get("prominence") in {"cover", "section"} or item.get("id") in selected_ids)
            and (not selected_ids or item.get("id") in selected_ids)
            and item.get("page_start")
            and item.get("edition_id") in editions
        ),
        key=lambda item: (item.get("date", ""), int(item.get("importance") or 0), item.get("id", "")),
        reverse=True,
    )
    if not args.force:
        candidates = [item for item in candidates if item["id"] not in by_record]
    candidates = candidates[: max(0, args.limit)]

    page_cache: dict[tuple[str, int], dict] = {}
    failures = []
    completed = 0
    for item in candidates:
        edition = editions[item["edition_id"]]
        pdf_path = source_root / edition["local_path"]
        page_number = int(item["page_start"])
        try:
            contents = pdf_path.read_bytes()
            source_hash = sha256_bytes(contents)
            if source_hash != item["document_sha256"]:
                raise ValueError("hash local diverge do manifesto validado")
            key = (source_hash, page_number)
            preview = page_cache.get(key)
            if preview is None:
                target = OUTPUT_DIR / f"{source_hash[:18]}-p-{page_number}.webp"
                width, height, preview_hash, size = render_page(pdf_path, page_number, target)
                preview = {
                    "src": f"/assets/sources/july/{target.name}",
                    "page": page_number,
                    "width": width,
                    "height": height,
                    "bytes": size,
                    "preview_sha256": preview_hash,
                }
                page_cache[key] = preview
            by_record[item["id"]] = {
                "record_id": item["id"],
                "source_url": item["official_url"],
                "source_sha256": source_hash,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                **preview,
            }
            completed += 1
        except Exception as error:
            failures.append(
                {
                    "record_id": item["id"],
                    "source_url": item.get("official_url"),
                    "page": page_number,
                    "error": str(error),
                }
            )

    output = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": "Renderização integral da página oficial em WebP; conteúdo textual não é reescrito.",
        "items": sorted(by_record.values(), key=lambda item: item["record_id"]),
        "failures": failures,
    }
    MANIFEST_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "candidates": len(candidates),
                "completed": completed,
                "failures": len(failures),
                "total_manifest": len(output["items"]),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
