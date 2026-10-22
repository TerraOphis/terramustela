"""Génère les déclinaisons du logo dans public/assets/img.

Usage : python3 scripts/generate-logos.py chemin/vers/logo-source.(png|jpg|webp)
Le logo source doit être carré, fond crème uni, emblème en haut et texte en bas.
"""
import sys
from pathlib import Path
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else "logo-source.webp"
out = Path(__file__).resolve().parent.parent / "public" / "assets" / "img"

im = Image.open(src).convert("RGB")
W, H = im.size
bg = im.getpixel((5, 5))

# Fond crème -> transparent (dégradé doux pour garder l'anticrénelage)
rgba = Image.new("RGBA", im.size)
src_px, dst_px = im.load(), rgba.load()
for y in range(H):
    for x in range(W):
        r, g, b = src_px[x, y]
        d = max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2]))
        a = 0 if d < 12 else (255 if d > 60 else int((d - 12) / 48 * 255))
        dst_px[x, y] = (r, g, b, a)

def solid_bbox(img, box=None):
    c = img.crop(box) if box else img
    bb = c.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    ox, oy = (box[0], box[1]) if box else (0, 0)
    return (ox + bb[0], oy + bb[1], ox + bb[2], oy + bb[3])

def pad_square(img, pad):
    s = int(max(img.size) * (1 + pad * 2))
    c = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    c.paste(img, ((s - img.width) // 2, (s - img.height) // 2), img)
    return c

# Séparation emblème / texte : première ligne vide sous l'emblème
alpha = rgba.getchannel("A")
rows = [any(alpha.getpixel((x, y)) > 40 for x in range(0, W, 2)) for y in range(H)]
top = rows.index(True)
split = next(y for y in range(top, H) if not rows[y] and any(rows[y:]) and y > H * 0.4)

full = rgba.crop(solid_bbox(rgba))
emblem = rgba.crop(solid_bbox(rgba, (0, 0, W, split)))
text = rgba.crop(solid_bbox(rgba, (0, split, W, H)))

pad_square(full, 0.04).resize((1024, 1024), Image.LANCZOS).save(out / "logo_carre.png", optimize=True)
em = pad_square(emblem, 0.02)
em.resize((512, 512), Image.LANCZOS).save(out / "emblem.png", optimize=True)
em.resize((256, 256), Image.LANCZOS).save(out / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
em.resize((180, 180), Image.LANCZOS).save(out / "apple-touch-icon.png")

h = 300
e = emblem.resize((int(emblem.width * h / emblem.height), h), Image.LANCZOS)
th = int(h * 0.62)
t = text.resize((int(text.width * th / text.height), th), Image.LANCZOS)
rect = Image.new("RGBA", (e.width + 30 + t.width, h), (0, 0, 0, 0))
rect.paste(e, (0, 0), e)
rect.paste(t, (e.width + 30, (h - th) // 2), t)
rect.save(out / "logo_rect.png", optimize=True)

im.resize((1200, 1200), Image.LANCZOS).save(out / "og-image.jpg", quality=86)
(out.parent.parent.parent / "favicon.ico").write_bytes((out / "favicon.ico").read_bytes())
print("Logos générés dans", out)
