"""v1.9.17: split 3 catbox 2x2 grids into 12 individual icons.
Each grid 1024x1024 → 4 × 512x512 → rembg cream bg → WebP 88%."""
from pathlib import Path
from PIL import Image
from rembg import remove
import io

ROOT = Path("C:/Users/acer/Desktop/wordwar/public/mascots")

# Each grid + cell names (top-left, top-right, bottom-left, bottom-right)
GRIDS = [
    ("icons-hud-raw.png", ["flag-en", "crown-gold", "coin-gold", "energy-bolt"]),
    ("icons-nav-raw.png", ["nav-home", "nav-tasks", "nav-profile", "nav-alerts"]),
    ("icons-map-raw.png", ["node-book", "node-headphones", "node-star", "node-paw"]),
]

INSET = 20  # crop a bit inside the cell to avoid the grey gridline edges

for grid_file, names in GRIDS:
    src = ROOT / grid_file
    img = Image.open(src)
    w, h = img.size
    mid_x, mid_y = w // 2, h // 2

    # Cell boxes (left, top, right, bottom)
    cells = [
        (INSET, INSET, mid_x - INSET, mid_y - INSET),                # top-left
        (mid_x + INSET, INSET, w - INSET, mid_y - INSET),            # top-right
        (INSET, mid_y + INSET, mid_x - INSET, h - INSET),            # bottom-left
        (mid_x + INSET, mid_y + INSET, w - INSET, h - INSET),        # bottom-right
    ]

    for name, box in zip(names, cells):
        crop = img.crop(box)
        # rembg removes the cream background → transparent
        crop_bytes = io.BytesIO()
        crop.save(crop_bytes, "PNG")
        nobg = remove(crop_bytes.getvalue())
        nobg_img = Image.open(io.BytesIO(nobg))
        # Save as WebP (lossy q=88)
        out = ROOT / f"{name}.webp"
        nobg_img.save(out, "WEBP", quality=88, method=6, lossless=False)
        print(f"{out.name}: {out.stat().st_size / 1024:.1f} KB")

print("\nDone. 12 icons saved to public/mascots/.")
