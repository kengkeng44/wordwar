"""v1.7.14: rembg + WebP compress the grandma anchor for map use."""
from pathlib import Path
from rembg import remove
from PIL import Image
import io

src = Path("C:/Users/acer/Desktop/wordwar/public/mascots/iso-incoming-1.png")
nobg = Path("C:/Users/acer/Desktop/wordwar/public/mascots/iso-grandma.png")
webp = Path("C:/Users/acer/Desktop/wordwar/public/mascots/iso-grandma.webp")

# rembg cuts the cream background
input_bytes = src.read_bytes()
output_bytes = remove(input_bytes)
nobg.write_bytes(output_bytes)
print(f"after rembg: {nobg.stat().st_size / 1024:.1f} KB")

# Convert to WebP for further size reduction (preserves alpha)
img = Image.open(io.BytesIO(output_bytes))
img.save(webp, "WEBP", quality=88, method=6, lossless=False)
print(f"after WebP : {webp.stat().st_size / 1024:.1f} KB")
print(f"original   : {src.stat().st_size / 1024:.1f} KB")
print(f"final ratio: {webp.stat().st_size * 100 / src.stat().st_size:.0f}% of original")
