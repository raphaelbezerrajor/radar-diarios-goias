"""Gera imagens WebP leves das páginas oficiais usadas nas matérias.

O PDF é lido diretamente da URL primária, validado e mantido apenas em memória.
A imagem é uma renderização integral da página: nenhum nome, número, data ou
valor é reescrito. O manifesto liga o derivado ao ato, à página e aos hashes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path

import fitz
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ACTS_PATH = ROOT / "data/trindade/agm-trindade-acts-search.json"
MANIFEST_PATH = ROOT / "data/trindade/source-previews.json"
OUTPUT_DIR = ROOT / "public/assets/sources/trindade"
ALLOWED_HOSTS = {"www-storage.voxtecnologia.com.br"}
USER_AGENT = "Pauteiro/1.0 (derivado visual de documento publico)"


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def safe_stem(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return normalized[:72] or hashlib.sha256(value.encode()).hexdigest()[:24]


def fetch_pdf(url: str) -> bytes:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError(f"domínio de PDF não permitido: {parsed.hostname or 'ausente'}")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/pdf"})
    with urllib.request.urlopen(request, timeout=90) as response:
        data = response.read()
        content_type = response.headers.get("content-type", "")
    if len(data) < 1024 or not data.startswith(b"%PDF"):
        raise ValueError(f"resposta não é PDF válido ({content_type or 'sem content-type'})")
    return data


def render_page(pdf_bytes: bytes, page_number: int, target: Path) -> tuple[int, int, str]:
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if page_number < 1 or page_number > document.page_count:
            raise ValueError(f"página {page_number} fora do PDF de {document.page_count} páginas")
        page = document.load_page(page_number - 1)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.55, 1.55), colorspace=fitz.csRGB, alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        if image.width > 1280:
            height = round(image.height * 1280 / image.width)
            image = image.resize((1280, height), Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, "WEBP", quality=76, method=6, optimize=True)
        contents = target.read_bytes()
        return image.width, image.height, digest(contents)
    finally:
        document.close()


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {"schema_version": 1, "items": [], "failures": []}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Renderiza páginas-fonte das matérias documentais")
    parser.add_argument("--limit", type=int, default=24)
    parser.add_argument("--since-days", type=int, default=14)
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--record-id", action="append", default=[])
    args = parser.parse_args()

    acts_payload = json.loads(ACTS_PATH.read_text(encoding="utf-8"))
    acts = sorted(acts_payload.get("acts", []), key=lambda item: (item.get("edition_date", ""), item.get("id", "")), reverse=True)
    newest = datetime.fromisoformat(f"{acts[0]['edition_date']}T12:00:00+00:00") if acts else datetime.now(timezone.utc)
    cutoff = (newest - timedelta(days=max(0, args.since_days))).date().isoformat()
    requested = set(args.record_id)

    manifest = load_manifest()
    by_record = {item["record_id"]: item for item in manifest.get("items", [])}
    candidates = []
    for act in acts:
        if requested and act.get("id") not in requested:
            continue
        if not requested and not args.all and act.get("edition_date", "") < cutoff:
            continue
        if not args.force and act.get("id") in by_record:
            continue
        if not act.get("source_url") or not act.get("page_start"):
            continue
        candidates.append(act)
        if not args.all and len(candidates) >= max(0, args.limit):
            break

    pdf_cache: dict[str, bytes] = {}
    page_cache: dict[tuple[str, int], dict] = {}
    failures = []
    completed = 0
    for act in candidates:
        record_id = act["id"]
        url = act["source_url"]
        page_number = int(act["page_start"])
        try:
            if url not in pdf_cache:
                pdf_cache[url] = fetch_pdf(url)
            pdf_bytes = pdf_cache[url]
            source_sha256 = digest(pdf_bytes)
            page_key = (source_sha256, page_number)
            preview = page_cache.get(page_key)
            if preview is None:
                stem = safe_stem(f"{source_sha256[:18]}-p-{page_number}")
                target = OUTPUT_DIR / f"{stem}.webp"
                width, height, preview_sha256 = render_page(pdf_bytes, page_number, target)
                preview = {
                    "src": f"/assets/sources/trindade/{target.name}",
                    "page": page_number,
                    "width": width,
                    "height": height,
                    "bytes": target.stat().st_size,
                    "preview_sha256": preview_sha256,
                }
                page_cache[page_key] = preview
            by_record[record_id] = {
                "record_id": record_id,
                "source_url": url,
                "source_sha256": source_sha256,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                **preview,
            }
            completed += 1
        except Exception as error:  # preserva a publicação textual e registra a falha visual
            failures.append({"record_id": record_id, "source_url": url, "page": page_number, "error": str(error)})

    output = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": "Renderização integral da página oficial em WebP; conteúdo textual não é reescrito.",
        "items": sorted(by_record.values(), key=lambda item: item["record_id"]),
        "failures": failures,
    }
    MANIFEST_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"candidates": len(candidates), "completed": completed, "failures": len(failures), "total_manifest": len(output["items"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
