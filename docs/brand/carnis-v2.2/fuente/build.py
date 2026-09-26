"""Carnis.app — asset pack V2.2 (vector redraw of approved V2.1).

Genera SVG (texto convertido a trazos), PNG, favicons y PDF vectorial.
"""
import os, io, json, shutil
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import cairosvg
from PIL import Image

OUT = "/home/claude/carnis/Carnis_Asset_Pack_V2.2"
FONT_ROOT = "/home/claude/fonts"

RED = "#E52223"
NAVY = "#0A2E5B"
WHITE = "#FFFFFF"
BLACK = "#000000"

# ---------------------------------------------------------------- tipografía
_fonts = {}
def font(spec):
    """spec = 'familia-peso', ej. 'kanit-700'."""
    if spec not in _fonts:
        fam, w = spec.rsplit("-", 1)
        _fonts[spec] = TTFont(f"{FONT_ROOT}/{fam}/package/files/{fam}-latin-{w}-normal.woff")
    return _fonts[spec]

def text_path(text, weight, size, x, y, tracking=0.0):
    """Devuelve (d, ancho, (xmin,ymin,xmax,ymax)) del texto como trazo SVG.
    y = línea de base. tracking en unidades em (ej. -0.01)."""
    f = font(weight)
    upm = f["head"].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]
    s = size / upm
    pen = SVGPathPen(gs)
    bpen = BoundsPen(gs)
    cx = 0.0
    for ch in text:
        g = cmap[ord(ch)]
        t = (s, 0, 0, -s, x + cx * s, y)
        gs[g].draw(TransformPen(pen, t))
        gs[g].draw(TransformPen(bpen, t))
        cx += hmtx[g][0] + tracking * upm
    width = (cx - tracking * upm) * s
    return pen.getCommands(), width, bpen.bounds

def text_width(text, weight, size, tracking=0.0):
    return text_path(text, weight, size, 0, 0, tracking)[1]

# ---------------------------------------------------------------- isotipo
# Caja 512 x 512. Toro simétrico respecto de x = 256.
def mirror(points):
    return [(512 - x, y) for x, y in points]

HEAD = (
    "M256 144 "
    "L196 144 C166 144 150 156 147 182 "
    "C144 206 140 228 140 250 "
    "C140 304 160 350 178 386 "
    "C162 404 156 426 158 448 "
    "C162 480 190 498 224 496 "
    "C238 495 248 490 256 490 "
    "C264 490 274 495 288 496 "
    "C322 498 350 480 354 448 "
    "C356 426 350 404 334 386 "
    "C352 350 372 304 372 250 "
    "C372 228 368 206 365 182 "
    "C362 156 346 144 316 144 Z"
)
HORN_L = (
    "M178 214 "
    "C106 222 56 190 56 134 "
    "C56 108 72 88 102 74 "
    "C96 114 116 154 170 170 Z"
)
HORN_R = (
    "M334 214 "
    "C406 222 456 190 456 134 "
    "C456 108 440 88 410 74 "
    "C416 114 396 154 342 170 Z"
)
EYE_L = "M142 254 C176 264 198 300 198 370 C190 326 172 294 145 276 Z"
EYE_R = "M370 254 C336 264 314 300 314 370 C322 326 340 294 367 276 Z"
NOSTRILS = [(213, 434, 17), (299, 434, 17)]
SQUARE = "M112 0 H400 A112 112 0 0 1 512 112 V400 A112 112 0 0 1 400 512 H112 A112 112 0 0 1 0 400 V112 A112 112 0 0 1 112 0 Z"

import pathops
from fontTools.svgLib.path import parse_path

def _pp(d):
    p = pathops.Path()
    parse_path(d, p.getPen())
    return p

def _circle_d(cx, cy, r):
    return (f"M{cx-r} {cy} A{r} {r} 0 1 0 {cx+r} {cy} A{r} {r} 0 1 0 {cx-r} {cy} Z")

def _to_d(p):
    pen = SVGPathPen(None)
    p.draw(pen)
    return pen.getCommands()

def _icon_geometry():
    bull = pathops.op(pathops.op(_pp(HORN_L), _pp(HORN_R), pathops.PathOp.UNION), _pp(HEAD), pathops.PathOp.UNION)
    feats = pathops.op(_pp(EYE_L), _pp(EYE_R), pathops.PathOp.UNION)
    for cx, cy, r in NOSTRILS:
        feats = pathops.op(feats, _pp(_circle_d(cx, cy, r)), pathops.PathOp.UNION)
    feats = pathops.op(feats, bull, pathops.PathOp.INTERSECTION)
    bull_final = pathops.op(bull, feats, pathops.PathOp.DIFFERENCE)   # toro blanco con ojos/narinas calados
    return bull_final

_GEOM = {}
def geom(key, bull_scale=1.0, full_bleed=False):
    k = (key, bull_scale, full_bleed)
    if k in _GEOM:
        return _GEOM[k]
    bull = _icon_geometry()
    if bull_scale != 1.0:
        o = 256 * (1 - bull_scale)
        bull = bull.transform(bull_scale, 0, 0, bull_scale, o, o) if hasattr(bull, "transform") else bull
    sq = _pp("M0 0 H512 V512 H0 Z") if full_bleed else _pp(SQUARE)
    if key == "bull":
        d = _to_d(bull)
    elif key == "square":
        d = _to_d(sq)
    else:  # knockout: cuadrado menos toro
        d = _to_d(pathops.op(sq, bull, pathops.PathOp.DIFFERENCE))
    _GEOM[k] = d
    return d

def bull_shapes(fill):
    return (f'<path d="{HORN_L}" fill="{fill}"/><path d="{HORN_R}" fill="{fill}"/>'
            f'<path d="{HEAD}" fill="{fill}"/>')

def feature_shapes(fill):
    s = f'<path d="{EYE_L}" fill="{fill}"/><path d="{EYE_R}" fill="{fill}"/>'
    for cx, cy, r in NOSTRILS:
        s += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>'
    return s

def icon_group(mode, tx=0, ty=0, scale=1.0, full_bleed=False, bull_scale=1.0):
    """mode: 'color' (cuadrado rojo + toro blanco) | 'black' | 'white' (una tinta:
    un solo trazo con el toro calado, deja ver el fondo)."""
    tf = f'translate({tx} {ty}) scale({scale})'
    if mode == 'color':
        return (f'<g transform="{tf}"><path d="{geom("square", bull_scale, full_bleed)}" fill="{RED}"/>'
                f'<path d="{geom("bull", bull_scale, full_bleed)}" fill="{WHITE}"/></g>')
    ink = BLACK if mode == 'black' else WHITE
    return f'<g transform="{tf}"><path d="{geom("knock", bull_scale, full_bleed)}" fill="{ink}"/></g>'

# ---------------------------------------------------------------- piezas
WM_WEIGHT = "kanit-700"
WM_TRACK = -0.004
TAG_WEIGHT = "kanit-600"
TAG_LINES = ["LA HERRAMIENTA DE VENTAS", "DE TU CARNICERÍA"]

def palette(mode):
    """Colores de texto por variante."""
    if mode == 'color':
        return dict(carnis=RED, app=NAVY, tag=NAVY, swoosh=RED, icon='color')
    if mode == 'dark':   # sobre fondo azul u oscuro
        return dict(carnis=WHITE, app=WHITE, tag=WHITE, swoosh=RED, icon='color')
    if mode == 'black':
        return dict(carnis=BLACK, app=BLACK, tag=BLACK, swoosh=BLACK, icon='black')
    if mode == 'white':
        return dict(carnis=WHITE, app=WHITE, tag=WHITE, swoosh=WHITE, icon='white')
    raise ValueError(mode)

def wordmark_paths(x, baseline, size, c):
    d1, w1, b1 = text_path("Carnis", WM_WEIGHT, size, x, baseline, WM_TRACK)
    gap = WM_TRACK * size
    d2, w2, b2 = text_path(".app", WM_WEIGHT, size, x + w1 + gap, baseline, WM_TRACK)
    svg = f'<path d="{d1}" fill="{c["carnis"]}"/><path d="{d2}" fill="{c["app"]}"/>'
    bounds = (min(b1[0], b2[0]), min(b1[1], b2[1]), max(b1[2], b2[2]), max(b1[3], b2[3]))
    return svg, bounds

def swoosh(x0, x1, y, thick, fill):
    """Trazo de pincel: puntas finas, más grueso hacia la izquierda-centro, leve arco."""
    w = x1 - x0
    return (f'<path d="M{x0} {y + thick*0.55} '
            f'C{x0 + w*0.30} {y - thick*0.55} {x0 + w*0.70} {y - thick*0.95} {x1} {y - thick*0.80} '
            f'C{x0 + w*0.70} {y - thick*0.35} {x0 + w*0.30} {y + thick*0.35} {x0} {y + thick*0.55} Z" fill="{fill}"/>')

def svg_doc(body, vb_w, vb_h, title, bg=None):
    bgr = f'<rect width="{vb_w}" height="{vb_h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w:.0f} {vb_h:.0f}" '
            f'width="{vb_w:.0f}" height="{vb_h:.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{bgr}{body}</svg>\n')

PAD = 24  # margen de seguridad alrededor de cada pieza

def build_horizontal(mode):
    c = palette(mode)
    icon = icon_group(c['icon'], PAD, PAD)
    tx = PAD + 512 + 48
    size = 300
    baseline = PAD + 250
    wm, wb = wordmark_paths(tx, baseline, size, c)
    wm_w = wb[2] - tx
    # bajada centrada bajo el wordmark, ocupando casi todo su ancho
    ref_w = text_width(TAG_LINES[0], TAG_WEIGHT, 100, 0.01)
    tag_size = 100 * (wm_w * 0.94) / ref_w
    body = icon + wm
    y = wb[3] + 16 + 0.70 * tag_size
    for line in TAG_LINES:
        lw = text_width(line, TAG_WEIGHT, tag_size, 0.01)
        lx = tx + (wm_w - lw) / 2
        d, _, _ = text_path(line, TAG_WEIGHT, tag_size, lx, y, 0.01)
        body += f'<path d="{d}" fill="{c["tag"]}"/>'
        y += tag_size * 1.08
    sw_y = y - tag_size * 0.55 + 36
    body += swoosh(tx + wm_w * 0.10, tx + wm_w * 0.90, sw_y, 64, c['swoosh'])
    W = tx + wm_w + PAD
    H = max(PAD * 2 + 512, sw_y + 40 + PAD)
    return body, W, H

def build_compact(mode):
    c = palette(mode)
    icon = icon_group(c['icon'], PAD, PAD)
    tx = PAD + 512 + 44
    size = 330
    # centrar ópticamente la altura de mayúsculas respecto del ícono
    cap = 0.70 * size
    baseline = PAD + 256 + cap / 2 + 4
    wm, wb = wordmark_paths(tx, baseline, size, c)
    W = wb[2] + PAD
    H = PAD * 2 + 512
    return icon + wm, W, H

def build_wordmark(mode):
    c = palette(mode)
    size = 300
    baseline = PAD + 0.745 * size
    wm, wb = wordmark_paths(PAD, baseline, size, c)
    return wm, wb[2] + PAD, wb[3] + PAD

def build_icon(mode, full_bleed=False, bull_scale=1.0):
    return icon_group(mode, 0, 0, 1.0, full_bleed, bull_scale), 512, 512

# ---------------------------------------------------------------- exportación
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)

def png(svg_text, path, width=None, height=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cairosvg.svg2png(bytestring=svg_text.encode(), write_to=path,
                     output_width=width, output_height=height)

def pdf(svg_text, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cairosvg.svg2pdf(bytestring=svg_text.encode(), write_to=path)

def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    files = {}
    LABEL = {'color': 'color', 'dark': 'fondo-oscuro', 'black': 'negro', 'white': 'blanco'}
    for kind, builder in [('horizontal', build_horizontal), ('compacto', build_compact), ('wordmark', build_wordmark)]:
        for mode in ['color', 'dark', 'black', 'white']:
            body, W, H = builder(mode)
            name = f"carnis-{kind}-{LABEL[mode]}"
            doc = svg_doc(body, W, H, "Carnis.app")
            write(f"{OUT}/svg/{name}.svg", doc)
            files[name] = (doc, W, H)
            png(doc, f"{OUT}/png/{name}.png", width=1200)
            png(doc, f"{OUT}/png/{name}@3x.png", width=3600)
            if mode in ('color', 'black'):
                pdf(doc, f"{OUT}/pdf/{name}.pdf")

    for mode, label in [('color', 'color'), ('black', 'negro'), ('white', 'blanco')]:
        body, W, H = build_icon(mode)
        doc = svg_doc(body, W, H, "Carnis.app")
        write(f"{OUT}/svg/carnis-icono-{label}.svg", doc)
        files[f"carnis-icono-{label}"] = (doc, W, H)
        png(doc, f"{OUT}/png/carnis-icono-{label}.png", width=1024)
    pdf(files["carnis-icono-color"][0], f"{OUT}/pdf/carnis-icono-color.pdf")

    # ---- íconos de app y favicons
    icon_doc = files["carnis-icono-color"][0]
    for s in [16, 32, 48, 96, 192, 512, 1024]:
        png(icon_doc, f"{OUT}/app-icons/carnis-icon-{s}.png", s, s)
    # Apple touch icon: cuadrado lleno (iOS redondea solo), sin transparencia
    body, W, H = build_icon('color', full_bleed=True, bull_scale=0.86)
    apple = svg_doc(body, W, H, "Carnis.app")
    png(apple, f"{OUT}/app-icons/apple-touch-icon-180.png", 180, 180)
    # Maskable (Android): fondo lleno, toro dentro de la zona segura del 80 %
    body, W, H = build_icon('color', full_bleed=True, bull_scale=0.74)
    mask = svg_doc(body, W, H, "Carnis.app")
    write(f"{OUT}/svg/carnis-icono-maskable.svg", mask)
    png(mask, f"{OUT}/app-icons/carnis-icon-maskable-512.png", 512, 512)
    png(mask, f"{OUT}/app-icons/carnis-icon-maskable-192.png", 192, 192)
    # favicon.ico con 16/32/48
    ims = [Image.open(f"{OUT}/app-icons/carnis-icon-{s}.png").convert("RGBA") for s in (48, 32, 16)]
    ims[0].save(f"{OUT}/app-icons/favicon.ico", sizes=[(48, 48), (32, 32), (16, 16)], append_images=ims[1:])
    shutil.copy(f"{OUT}/svg/carnis-icono-color.svg", f"{OUT}/app-icons/favicon.svg")
    return files

if __name__ == "__main__":
    files = main()
    print("OK", len(files), "piezas vectoriales")
