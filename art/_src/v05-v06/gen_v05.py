import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

OUT = '/Users/dangkhoi/Documents/Project/spa_web_game/art/views'
SCR = os.path.dirname(os.path.abspath(__file__))

NOTCH = (505, 800)            # sternal (jugular) notch
CHIN = (545, 466)
THYROID = (522, 575)
MASTOID_L = (276, 320)        # viewer-left (customer's right) — prominent side
MASTOID_R = (740, 336)

# SCM borders (polyline top -> bottom)
ANT_L = [(302, 314), (330, 400), (372, 500), (412, 610), (448, 700), (474, 770), (490, 800)]
POST_L = [(270, 320), (282, 400), (306, 500), (336, 600), (368, 700), (392, 770), (398, 806)]
ANT_R = [(718, 368), (702, 420), (672, 510), (634, 600), (594, 690), (552, 760), (520, 800)]
POST_R = [(738, 362), (734, 430), (720, 520), (698, 610), (664, 700), (628, 770), (614, 806)]


def interp_x(line, y):
    for (x1, y1), (x2, y2) in zip(line, line[1:]):
        if y1 <= y <= y2:
            return x1 + (x2 - x1) * (y - y1) / (y2 - y1)
    raise ValueError(y)


def scm_poly(ant, post, left=True):
    # anterior border down to sternal head, notch between heads, clavicular head, posterior border up
    if left:
        heads = [(470, 806), (448, 784), (432, 806)]
    else:
        heads = [(540, 806), (560, 786), (576, 806)]
    return ant + heads + list(reversed(post))


SCM_L = scm_poly(ANT_L, POST_L, True)
SCM_R = scm_poly(ANT_R, POST_R, False)

PLAT_L = [(336, 372), (400, 424), (470, 456), (496, 470), (494, 560), (480, 680), (470, 780),
          (452, 860), (330, 872), (200, 850), (270, 680), (306, 560), (312, 440)]
PLAT_R = [(712, 372), (660, 424), (600, 456), (568, 470), (566, 560), (574, 680), (590, 780),
          (612, 860), (730, 872), (850, 850), (750, 680), (700, 560), (722, 440)]


def carotid_strip(ant, y0, y1, back, front, sign):
    """strip along anterior border: back = px over the muscle, front = px in front of it.
    sign=+1 when anterior (medial) is +x (viewer-left side)."""
    ys = list(range(y0, y1 + 1, 45))
    if ys[-1] != y1:
        ys.append(y1)
    a = [(round(interp_x(ant, y) + sign * front), y) for y in ys]
    b = [(round(interp_x(ant, y) - sign * back), y) for y in reversed(ys)]
    return a + b


CAR_L = carotid_strip(ANT_L, 400, 660, 10, 38, +1)
CAR_R = carotid_strip(ANT_R, 410, 650, 10, 38, -1)

# ---------------------------------------------------------------- SVG
svg = []
A = svg.append
A('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">')
A('  <title>V05 – Cổ trước và nghiêng</title>')
A('  <defs><clipPath id="v05-neck-clip"><path d="M280,250 C280,380 288,500 300,596 C240,656 130,690 -10,708 L-10,1410 L1010,1410 L1010,708 C880,690 770,656 706,598 C722,500 736,400 744,250 Z"/></clipPath></defs>')
A('  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>')

A('  <g id="base" stroke="#9a6a52" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">')
# neck + shoulders + chest
A(f'    <path d="M280,250 C280,380 288,500 300,596 C240,656 130,690 -10,708 L-10,1410 L1010,1410 L1010,708 '
  f'C880,690 770,656 706,598 C722,500 736,400 744,250 Z" fill="{SHADE}"/>')
# ears (behind face)
A(f'    <path d="M304,160 C272,138 236,160 238,208 C240,254 254,290 284,304 C296,308 304,298 304,288 Z" fill="{SHADE}"/>')
A('    <path d="M290,180 C270,172 258,190 260,214 C262,240 272,262 286,270" fill="none" stroke-width="3"/>')
A(f'    <path d="M744,170 C764,166 776,190 774,222 C772,256 762,282 746,292 Z" fill="{SHADE}"/>')
# face
A(f'    <path d="M300,-10 C292,60 288,150 296,240 C304,300 316,340 338,372 C392,428 470,462 540,466 '
  f'C604,466 652,430 690,392 C722,356 740,300 748,230 C754,150 754,60 748,-10 Z" fill="{SKIN}"/>')
# spa wrap / towel across the chest
A('    <path d="M-10,972 C180,948 380,962 505,958 C650,954 840,944 1010,962 L1010,1410 L-10,1410 Z" fill="#fffaf3" stroke="#c49a70"/>')
A('    <path d="M-10,1000 C180,978 380,992 505,988 C650,984 840,974 1010,992" fill="none" stroke="#e7b4a6" stroke-width="6"/>')
A('    <path d="M610,956 L676,953 L652,1012 Z" fill="#f4e6d6" stroke="#c49a70" stroke-width="3"/>')
A('    <path d="M-10,1030 C180,1008 380,1022 505,1018 C650,1014 840,1004 1010,1022" fill="none" stroke="#e8d2b8" stroke-width="3"/>')
A('    <path d="M200,1060 C230,1160 240,1260 236,1400 M820,1050 C800,1160 796,1280 800,1400" fill="none" stroke="#e8d2b8" stroke-width="3"/>')
A('  </g>')

A('  <g id="skin-detail" fill="none" stroke-linecap="round" stroke-linejoin="round">')
# shadow under the jaw (works with any skin colour)
A('    <path d="M296,250 C306,330 330,390 380,420 C430,450 490,470 540,472 C604,472 656,440 700,396 C726,366 742,320 750,260 '
  'L752,330 C736,420 690,480 610,500 C560,510 500,505 450,486 C380,460 320,410 290,330 Z" fill="#9a6a52" opacity="0.10" clip-path="url(#v05-neck-clip)"/>')
# SCM ridge (prominent on viewer-left) and soft hollow behind it
A('    <path d="M300,322 C330,420 400,600 470,760" stroke="#d9a58c" stroke-width="3"/>')
A('    <path d="M280,332 C292,440 336,600 392,770" stroke="#dcab93" stroke-width="2"/>')
A('    <path d="M718,362 C694,470 636,620 556,760" stroke="#dcab93" stroke-width="2"/>')
A('    <path d="M392,780 C410,770 432,770 444,790" stroke="#d9a58c" stroke-width="2"/>')
# supraclavicular hollows
A('    <path d="M300,760 C340,740 372,750 392,786 C350,782 320,778 300,760 Z" fill="#9a6a52" opacity="0.08"/>')
A('    <path d="M710,760 C670,742 640,752 620,786 C660,782 690,778 710,760 Z" fill="#9a6a52" opacity="0.08"/>')
# neck rings (soft)
A('    <path d="M430,640 C470,652 520,652 570,640" stroke="#e0b39b" stroke-width="2"/>')
A('    <path d="M440,700 C480,710 530,710 572,700" stroke="#e0b39b" stroke-width="2"/>')
# blush
A('    <ellipse cx="380" cy="190" rx="52" ry="30" fill="#e9a99b" opacity="0.35"/>')
A('    <ellipse cx="690" cy="196" rx="34" ry="26" fill="#e9a99b" opacity="0.35"/>')
A('    <path d="M520,420 C536,428 556,428 572,420" stroke="#e0b39b" stroke-width="3"/>')
A('  </g>')

A(f'  <g id="hair">')
A(f'    <path d="M300,-10 C298,40 294,96 300,150 C276,152 250,166 236,196 C204,144 194,60 200,-10 Z" fill="{HAIR}"/>')
A(f'    <path d="M748,-10 C752,50 754,104 750,160 C770,150 784,116 792,60 L796,-10 Z" fill="{HAIR}"/>')
A(f'    <path d="M236,196 C226,240 236,292 264,334 C256,292 260,250 272,226 Z" fill="{HAIR}"/>')
A('  </g>')

A('  <g id="features" fill="none" stroke-linecap="round" stroke-linejoin="round">')
A('    <path d="M352,22 C382,4 432,4 466,18" stroke="#4a342c" stroke-width="12"/>')
A('    <path d="M604,18 C640,6 676,8 700,24" stroke="#4a342c" stroke-width="11"/>')
# closed, relaxed eyes
A('    <path d="M362,72 C390,92 438,92 466,74" stroke="#5a3d30" stroke-width="4"/>')
A('    <path d="M372,84 L366,96 M394,92 L391,104 M418,93 L418,105 M442,89 L446,100" stroke="#5a3d30" stroke-width="2.5"/>')
A('    <path d="M604,74 C626,92 664,92 688,72" stroke="#5a3d30" stroke-width="4"/>')
A('    <path d="M614,85 L609,96 M634,92 L632,104 M656,93 L658,104 M676,86 L681,96" stroke="#5a3d30" stroke-width="2.5"/>')
# nose
A('    <path d="M528,60 C532,120 544,170 556,204" stroke="#c9967c" stroke-width="4"/>')
A('    <path d="M522,212 C506,230 532,242 552,234 C568,242 594,238 592,218" stroke="#9a6a52" stroke-width="4"/>')
A('    <path d="M548,286 L552,248 M570,286 L568,248" stroke="#e0b39b" stroke-width="3"/>')
# lips (closed, soft smile)
A('    <path d="M488,316 C522,298 546,296 560,304 C576,296 600,298 628,314 C590,324 524,324 488,316 Z" fill="#d98a83" stroke="#a55a54" stroke-width="3"/>')
A('    <path d="M488,316 C524,324 590,324 628,314 C602,346 512,348 488,316 Z" fill="#e39a92" stroke="#a55a54" stroke-width="3"/>')
A('  </g>')

A('  <g id="landmarks" fill="none" stroke="#c9967c" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">')
A('    <path id="mandible-left" d="M300,250 C306,310 318,346 342,374 C396,422 470,452 540,456" opacity="0.8"/>')
A('    <path id="mandible-right" d="M540,456 C600,456 646,424 682,388 C712,356 730,312 738,262" opacity="0.8"/>')
A('    <path id="mandible-angle-left" d="M322,338 C330,356 338,366 352,376" stroke-width="2"/>')
A(f'    <path id="mastoid-left" d="M262,302 C256,320 262,338 278,340 C290,338 294,324 290,310"/>')
A(f'    <path id="mastoid-right" d="M732,318 C730,334 736,346 746,346"/>')
A('    <path id="clavicle-left" d="M482,812 C440,796 360,786 290,798 C220,810 130,790 20,770"/>')
A('    <path id="clavicle-right" d="M528,812 C570,796 650,786 720,798 C790,810 880,790 990,770"/>')
A('    <path id="clavicle-left-lower" d="M470,826 C420,812 360,806 300,814" stroke-width="2" opacity="0.6"/>')
A('    <path id="clavicle-right-lower" d="M540,826 C590,812 650,806 710,814" stroke-width="2" opacity="0.6"/>')
A('    <path id="sternal-notch" d="M484,800 C490,822 520,822 526,800"/>')
A('    <path id="thyroid-cartilage" d="M502,560 L522,592 L542,560 M506,604 C516,610 528,610 538,604" stroke-width="2.5"/>')
A('  </g>')

A('  <g id="muscles" fill="#d98a83" fill-opacity="0.35" stroke="#c0605a" stroke-width="2" stroke-linejoin="round">')
A(f'    <polygon id="m-platysma-left" points="{poly_attr(PLAT_L)}" fill="#e7b4a6" fill-opacity="0.45" stroke-dasharray="6 4"/>')
A(f'    <polygon id="m-platysma-right" points="{poly_attr(PLAT_R)}" fill="#e7b4a6" fill-opacity="0.45" stroke-dasharray="6 4"/>')
A(f'    <polygon id="m-sternocleidomastoid-left" points="{poly_attr(SCM_L)}"/>')
A(f'    <polygon id="m-sternocleidomastoid-right" points="{poly_attr(SCM_R)}"/>')
A('  </g>')

A('  <g id="guides" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" fill="none" opacity="0.8">')
A(f'    <path id="guide-midline" d="M{CHIN[0]},{CHIN[1]+6} C540,560 520,700 {NOTCH[0]},{NOTCH[1]} L505,950"/>')
A(f'    <polyline id="guide-scm-anterior-left" points="{poly_attr(ANT_L)}" stroke-dasharray="4 6"/>')
A(f'    <polyline id="guide-scm-anterior-right" points="{poly_attr(ANT_R)}" stroke-dasharray="4 6"/>')
A('  </g>')
A('</svg>')
svg_text = '\n'.join(svg) + '\n'


# ---------------------------------------------------------------- JSON
def center_line(ant, post, y):
    return (interp_x(ant, y) + interp_x(post, y)) / 2


def mus(mid, name, side, poly, strokes):
    return dict(id=mid, name=name, side=side, svgPath=f'm-{mid}-{side}', polygon=[npt(p) for p in poly],
                strokes=[{'from': npt(a), 'to': npt(b)} for a, b in strokes],
                maxAngleDeg=30, minLengthRatio=0.6)


scm_L_str = [((center_line(ANT_L, POST_L, 340), 340), (center_line(ANT_L, POST_L, 780), 780))]
scm_R_str = [((center_line(ANT_R, POST_R, 420), 420), (center_line(ANT_R, POST_R, 740), 740))]
plat_L_str = [((326, 430), (290, 800)), ((490, 480), (464, 800))]
plat_R_str = [((704, 480), (734, 800)), ((700, 482), (650, 800))]

muscles = [
    mus('sternocleidomastoid', 'Cơ ức đòn chũm', 'left', SCM_L, scm_L_str),
    mus('sternocleidomastoid', 'Cơ ức đòn chũm', 'right', SCM_R, scm_R_str),
    mus('platysma', 'Cơ bám da cổ', 'left', PLAT_L, plat_L_str),
    mus('platysma', 'Cơ bám da cổ', 'right', PLAT_R, plat_R_str),
]
for m in muscles:
    m['force'] = 'nhẹ'
msg = 'Tránh ấn vào động mạch cảnh ở bờ trước cơ ức đòn chũm.'
forbidden = [
    dict(id='carotid-left', shape='polygon', points=[npt(p) for p in CAR_L], message=msg),
    dict(id='carotid-right', shape='polygon', points=[npt(p) for p in CAR_R], message=msg),
]
# ---------------------------------------------------------------- thốn scale
# Frontal neck reference (Nhân Nghênh ST9): at the level of the upper border of the thyroid cartilage, the anterior
# border of the SCM lies 1.5 cun lateral to the anterior midline (Phù Đột LI18, mid-SCM, 3 cun). Measured on both
# sides at y = THYROID_TOP and averaged; applied isotropically (the neck is not foreshortened vertically here).
THYROID_TOP = 560


def midline_x(y):
    line = [(CHIN[0], CHIN[1] + 6), THYROID, NOTCH]
    return interp_x(line, y)


_mx = midline_x(THYROID_TOP)
_half = ((_mx - interp_x(ANT_L, THYROID_TOP)) + (interp_x(ANT_R, THYROID_TOP) - _mx)) / 2
UNITS_PER_CUN = round(_half / 1.5)          # SVG units (frame width 1000)
cun = {
    'unitsPerCun': round(UNITS_PER_CUN / 1000, 4),
    'reference': ('Thốn theo tỉ lệ (vùng cổ trước): ngang mức bờ trên sụn giáp (y %.4f), bờ trước cơ ức đòn chũm cách '
                  'đường giữa cổ 1,5 thốn (huyệt Nhân Nghênh ST9; giữa cơ ức đòn chũm – Phù Đột LI18 – 3 thốn). '
                  'Đo cả hai bên rồi lấy trung bình: %.0f đv ⇒ 1 thốn = %d đv = %.3f chiều rộng, dùng cho cả chiều dọc. '
                  'Kiểm tra: hõm ức → cằm ≈ %s thốn (≈ 8–9 cm ở người lớn).')
                 % (THYROID_TOP / 1400, _half, UNITS_PER_CUN, UNITS_PER_CUN / 1000, ('%.1f' % ((NOTCH[1] - CHIN[1]) / UNITS_PER_CUN)).replace('.', ',')),
}

data = {
    'view': 'V05', 'title': 'Cổ trước và nghiêng', 'svg': 'V05.svg',
    'frame': {'width': 1000, 'height': 1400},
    'variants': {},
    'sideConvention': 'viewer: "left" = bên trái màn hình (= bên PHẢI của khách, vì khách nhìn về phía người chơi). Đầu khách hơi xoay sang trái của khách (phải màn hình) nên cơ ức đòn chũm bên trái màn hình nổi rõ.',
    'midlineX': 0.505,
    'midline': [npt((CHIN[0], CHIN[1] + 6)), npt(THYROID), npt(NOTCH)],
    'cun': cun,
    'landmarksRef': {
        'sternalNotch': npt(NOTCH), 'thyroidCartilage': npt(THYROID), 'chin': npt(CHIN),
        'mastoid': {'left': npt(MASTOID_L), 'right': npt(MASTOID_R)},
        'scmAnteriorBorder': {'left': [npt(p) for p in ANT_L], 'right': [npt(p) for p in ANT_R]},
    },
    'points': [],
    'muscles': muscles,
    'forbidden': forbidden,
    'zones': [],
}
open(f'{OUT}/V05.svg', 'w', encoding='utf-8').write(svg_text)
dump_json(f'{OUT}/V05.json', data)
debug_overlay(svg_text, data, f'{SCR}/V05-debug.svg')

# sanity: strokes must not enter forbidden polygons
def inside(pt, poly):
    x, y = pt; c = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (x2 - x1) * (y - y1) / (y2 - y1):
            c = not c
    return c
for m in muscles:
    for s in m['strokes']:
        for k in range(21):
            t = k / 20
            p = (s['from'][0] + (s['to'][0] - s['from'][0]) * t, s['from'][1] + (s['to'][1] - s['from'][1]) * t)
            for f in forbidden:
                if inside(p, [tuple(q) for q in f['points']]):
                    print('STROKE IN FORBIDDEN', m['id'], m['side'], f['id'], p)
                    break
        for p in (s['from'], s['to']):
            if not inside(p, [tuple(q) for q in m['polygon']]):
                print('stroke endpoint outside polygon', m['id'], m['side'], p)
print('ok')
