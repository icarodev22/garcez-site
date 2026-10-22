"""Gera as imagens otimizadas do site a partir dos originais.
Uso: python3 scripts/prepare_images.py <pasta_originais> <pasta_saida>"""
import sys, os
from PIL import Image, ImageOps

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

# nome no site -> arquivo original. Cada foto aparece UMA única vez no site.
PHOTOS = {
    "quem-sou-principal":   "@psimoesll - GARCEZ -45.jpg",      # Quem Sou (grande)
    "quem-sou-detalhe":     "@psimoesll - GARCEZ -76.jpg",      # Quem Sou (detalhe)
    "lookbook-balaclava":   "@psimoesll - GARCEZ -61.jpg",      # Lookbook
    "lookbook-spot":        "@psimoesll - GARCEZ -66.jpg",      # Lookbook
    "carimbada-palco":      "@gabriellrec-69.jpg",              # Carreira
    "carimbada-cabine":     "@gabriellrec-54.jpg",              # Carreira
    "intermed-natal":       "Intermed Litoral Leste - Natal_RN.PNG",  # Carreira
    "echoes-petrolina":     "Echoes - Petrolina_PNZ.PNG",       # Carreira
    "pista-verde":          "@gabriellrec-4.jpg",               # Carreira (registros)
    "pista-camisa":         "@mjhulyalmeida-19.jpg",            # Carreira (registros)
    "contato-palco":        "Intermed Litoral Leste - Natal_RN (1).PNG",  # Contato (fundo)
    # fotos adicionadas na 2ª rodada
    "ensaio-verde-agachado":    "ensaio-verde-agachado.jpg",          # Ensaios
    "ensaio-vermelho-corpo":    "ensaio-vermelho-corpo-inteiro.jpg",  # Ensaios
    "ensaio-verde-sentado":     "ensaio-verde-sentado.jpg",           # Ensaios
    "pista-cabine-amarela":     "pista-cabine-camisa-amarela.jpg",    # Carreira (Na pista)
}
# Para incluir novas fotos: adicione uma linha acima, rode o script e
# acrescente o item correspondente em js/ensaios.js (galeria) ou no HTML.
WIDTHS = [640, 1200]

for name, fn in PHOTOS.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, fn))).convert("RGB")
    for w in WIDTHS:
        if w > im.width and w != WIDTHS[0]:
            w = im.width
        r = im.copy()
        r.thumbnail((w, 10_000), Image.LANCZOS)
        r.save(os.path.join(OUT, f"{name}-{w}.webp"), "WEBP", quality=78, method=6)
    print(name, im.size)

# HERO — 3 fotos EXCLUSIVAS do hero (não usar em nenhuma outra seção)
HERO = {
    "garcez-vermelho": "@psimoesll - GARCEZ -46.jpg",
    "garcez-azul":     "@psimoesll - GARCEZ -109.jpg",
    "garcez-ciano":    "@psimoesll - GARCEZ -72.jpg",
}
os.makedirs(os.path.join(OUT, "hero"), exist_ok=True)
for name, fn in HERO.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, fn))).convert("RGB")
    for w in (720, 1365):
        r = im.copy(); r.thumbnail((w, 10_000), Image.LANCZOS)
        r.save(os.path.join(OUT, "hero", f"{name}-{w}.webp"), "WEBP", quality=82, method=6)
    print("hero", name, im.size)

# Logo: original preto em fundo transparente -> versões branca e vermelha
logo = Image.open(os.path.join(SRC, "GARCEZ PRETO.png")).convert("RGBA")
logo = logo.crop(logo.getbbox())
alpha = logo.getchannel("A")
for color, tag in [((255, 255, 255), "branco"), ((229, 9, 43), "vermelho")]:
    solid = Image.new("RGBA", logo.size, color + (255,))
    solid.putalpha(alpha)
    s = solid.copy(); s.thumbnail((1600, 1600), Image.LANCZOS)
    s.save(os.path.join(OUT, f"logo-garcez-{tag}.png"), optimize=True)
    s.save(os.path.join(OUT, f"logo-garcez-{tag}.webp"), "WEBP", quality=90)
print("logo", logo.size)

# Favicon: letra "G" do logotipo, em branco sobre quadrado vermelho
g = alpha.crop((0, 0, int(logo.width * 0.155), logo.height))
g = g.crop(g.getbbox())
for size, fname in [(32, "favicon-32.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")]:
    canvas = Image.new("RGBA", (size, size), (229, 9, 43, 255))
    gm = g.copy(); gm.thumbnail((int(size * .62), int(size * .62)), Image.LANCZOS)
    white = Image.new("RGBA", gm.size, (255, 255, 255, 255)); white.putalpha(gm)
    canvas.alpha_composite(white, ((size - gm.width) // 2, (size - gm.height) // 2))
    canvas.save(os.path.join(OUT, fname))

# Imagem de compartilhamento (Open Graph) 1200x630: recorte do hero + logo
hero = ImageOps.exif_transpose(Image.open(os.path.join(SRC, HERO["garcez-vermelho"]))).convert("RGB")
og = Image.new("RGB", (1200, 630), (8, 8, 8))
h = hero.copy(); h.thumbnail((10_000, 900))
top = int(h.height * 0.08)
og.paste(h.crop((0, top, h.width, top + 630)), (1200 - h.width, 0))
lw = Image.open(os.path.join(OUT, "logo-garcez-branco.png")); lw.thumbnail((560, 200))
og.paste(lw, (60, 630 - lw.height - 80), lw)
og.save(os.path.join(OUT, "og-garcez.jpg"), quality=85)
print("ok")
