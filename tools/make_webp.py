"""Make WebP copies of the job photos: full size, 800 px (wide photos only) and 600 px.
Run after adding or replacing a photo in public/img/work/:  python3 tools/make_webp.py"""
from pathlib import Path
from PIL import Image

WORK = Path(__file__).resolve().parent.parent / "public" / "img" / "work"
for jpg in sorted(WORK.glob("*.jpg")):
    im = Image.open(jpg).convert("RGB")
    im.save(jpg.with_suffix(".webp"), "WEBP", quality=62, method=6)
    for w, q in ((800, 64), (600, 72)):
        if w == 800 and im.width <= 800:
            continue
        s = im.copy(); s.thumbnail((w, w * im.height // im.width))
        s.save(WORK / f"{jpg.stem}-{w}.webp", "WEBP", quality=q, method=6)
    print(jpg.name)
