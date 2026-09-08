"""Source-page previews for the two manually revised AGM stories."""
import json
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('source_renderer', Path(__file__).with_name('render-control-previews.py'))
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)
ROOT, MANIFEST_PATH, OUTPUT_DIR = renderer.ROOT, renderer.MANIFEST_PATH, renderer.OUTPUT_DIR
digest, render_page = renderer.digest, renderer.render_page

manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
items = {item['record_id']: item for item in manifest['items']}
news = json.loads((ROOT / 'data/trindade/july-document-news-2026.json').read_text(encoding='utf-8'))
pdf = ROOT.parent / 'trindade-aberta/data/raw/municipal-diaries/agm/2026/09/2026-09-08-3698.pdf'
source_hash = digest(pdf.read_bytes())
for story in news['items']:
    if story['id'] not in {'jul26-agm-114622-942B6CCB-62', 'jul26-agm-114622-602F28B3-6'}:
        continue
    assert source_hash == story['document_sha256']
    page = story['page_start']
    name = f'{source_hash[:18]}-p-{page}.webp'
    items[story['id']] = {
        'record_id': story['id'], 'source_url': story['official_url'],
        'source_sha256': source_hash, 'page': page,
        'src': f'/assets/sources/control/{name}',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        **render_page(pdf, page, OUTPUT_DIR / name),
    }
manifest['items'] = sorted(items.values(), key=lambda item: item['record_id'])
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Two municipal source previews verified and rendered')
