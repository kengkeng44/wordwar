"""v1.7.13: convert calico-anchor.png -> .webp for ~80% file size reduction.

PNG is 754KB, WebP at quality=85 typically lands at 90-150KB.
All modern browsers support WebP (Safari 14+, Chrome 32+, Firefox 65+).
"""
from PIL import Image
from pathlib import Path

src = Path("C:/Users/acer/Desktop/wordwar/public/mascots/calico-anchor.png")
dst = Path("C:/Users/acer/Desktop/wordwar/public/mascots/calico-anchor.webp")

img = Image.open(src)
img.save(dst, "WEBP", quality=88, method=6, lossless=False)
print(f"src: {src.stat().st_size / 1024:.1f} KB")
print(f"dst: {dst.stat().st_size / 1024:.1f} KB ({dst.stat().st_size * 100 / src.stat().st_size:.0f}%)")
