import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

OUT = '/Users/dangkhoi/Documents/Project/spa_web_game/art/views'
SCR = os.path.dirname(os.path.abspath(__file__))

MID = 500
CUN = 32.0                    # px per cun: midline -> medial border of scapula = 3 cun = 96 px
BL_OFF = 1.5 * CUN            # 48 px
SCAP_MEDIAL = MID - 3 * CUN   # 404

# spinous process centres (svg y)
VERT = [('C7', 300), ('T1', 334), ('T2', 369), ('T3', 404), ('T4', 440), ('T5', 476),
        ('T6', 513), ('T7', 550), ('T8', 588), ('T9', 626), ('T10', 665), ('T11', 704),
        ('T12', 744), ('L1', 786), ('L2', 830), ('L3', 875), ('L4', 920), ('L5', 964)]
VY = dict(VERT)
BELOW = 17                    # depression / level of lower border below each spinous centre

ACROMION = (252, 326)          # lateral end of acromion (viewer left)

# ---------------------------------------------------------------- shapes (viewer-left half)
torso_L = ("M500,214 L436,214 C433,240 430,262 420,278 C384,292 304,298 262,314 "
           "C250,330 254,360 270,390 C282,430 296,470 303,500 "
           "C312,600 330,700 338,782 C340,860 312,940 296,1010 L292,1060 L500,1060 Z")
arm_L = ("M262,314 C224,328 199,362 201,408 C194,480 186,590 188,700 C191,790 200,900 210,1032 "
         "L288,1032 C290,940 284,800 283,700 C286,610 294,540 303,500 "
         "C296,470 284,430 274,396 C264,370 258,340 262,314 Z")
arm_out_L = "M262,314 C224,328 199,362 201,408 C194,480 186,590 188,700 C191,790 200,900 210,1032"
arm_in_L = "M303,500 C294,540 286,610 283,700 C284,800 290,940 288,1032"
arm_crease_L = "M303,500 C299,484 295,470 290,456"

def full(d_left):
    """Turn a left-half closed path ending at the midline into a full symmetric outline."""
    return d_left


def body_path():
    # build full outline: left half going down, mirrored right half going up
    pts_left = torso_L
    return pts_left


svg = []
A = svg.append
A('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">')
A('  <title>V06 – Lưng (nằm sấp)</title>')
A('  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>')

# ---------------------------------------------------------------- base
A('  <g id="base" stroke-linejoin="round" stroke-linecap="round">')
# massage table + sheet
A('    <rect x="130" y="-20" width="740" height="1440" rx="40" fill="#e8d2b8" stroke="#c49a70" stroke-width="4"/>')
A('    <rect x="152" y="-20" width="696" height="1440" rx="30" fill="#fffaf3" stroke="#e8d2b8" stroke-width="3"/>')
# ears (behind hair)
A(f'    <ellipse cx="402" cy="146" rx="16" ry="34" fill="{SHADE}" stroke="{OUT_BODY}" stroke-width="3"/>')
A(f'    <ellipse cx="598" cy="146" rx="16" ry="34" fill="{SHADE}" stroke="{OUT_BODY}" stroke-width="3"/>')
# torso: left half + mirrored right half drawn as one path
right = mirror(torso_L)
A(f'    <path d="{torso_L}" fill="{SKIN}" stroke="none"/>')
A(f'    <path d="{right}" fill="{SKIN}" stroke="none"/>')
# outlines (open paths so there is no seam on midline)
outline_L = "M436,190 L436,214 C433,240 430,262 420,278 C384,292 304,298 262,314"
side_L = "M303,500 C312,600 330,700 338,782 C340,860 312,940 296,1010 L292,1060"
for d in (outline_L, mirror(outline_L), side_L, mirror(side_L)):
    A(f'    <path d="{d}" fill="none" stroke="{OUT_BODY}" stroke-width="4"/>')
# arms on top of torso (deltoid included)
for sgn in (1, -1):
    mf = (lambda d: d) if sgn == 1 else mirror
    A(f'    <path d="{mf(arm_L)}" fill="{SKIN}" stroke="none"/>')
    A(f'    <path d="{mf(arm_out_L)}" fill="none" stroke="{OUT_BODY}" stroke-width="4"/>')
    A(f'    <path d="{mf(arm_in_L)}" fill="none" stroke="{OUT_BODY}" stroke-width="4"/>')
    A(f'    <path d="{mf(arm_crease_L)}" fill="none" stroke="{OUT_BODY}" stroke-width="3"/>')
# towel over hips (sage, with folds)
A('    <path d="M262,1000 C380,984 620,984 738,1000 L760,1420 L240,1420 Z" fill="#a9c9b3" stroke="#4f7a62" stroke-width="4"/>')
A('    <path d="M266,1024 C380,1008 620,1008 734,1024" fill="none" stroke="#8fb39a" stroke-width="5"/>')
A('    <path d="M262,1000 C380,984 620,984 738,1000 L740,1030 C620,1016 380,1016 260,1030 Z" fill="#8fb39a" stroke="#4f7a62" stroke-width="3"/>')
for x1, x2 in ((360, 352), (500, 500), (640, 648)):
    A(f'    <path d="M{x1},1060 C{x1+6},1180 {x2-6},1300 {x2},1400" fill="none" stroke="#8fb39a" stroke-width="3"/>')
# hands resting on the towel edge (drawn after towel)
hand_L = ("M210,1028 C202,1066 204,1118 218,1148 C228,1166 258,1172 276,1162 "
          "C284,1150 286,1136 284,1122 C298,1112 302,1090 292,1072 C290,1058 290,1044 288,1028 Z")
hand_out_L = hand_L.replace(" Z", "")
for d, o in ((hand_L, hand_out_L), (mirror(hand_L), mirror(hand_out_L))):
    A(f'    <path d="{d}" fill="{SKIN}" stroke="none"/>')
    A(f'    <path d="{o}" fill="none" stroke="{OUT_BODY}" stroke-width="4"/>')
A('  </g>')

# ---------------------------------------------------------------- skin detail
A(f'  <g id="skin-detail" fill="none" stroke-linecap="round" stroke-linejoin="round">')
# soft shading on scapulae and flanks
for s in (1, -1):
    def X(x):
        return x if s == 1 else 1000 - x
    A(f'    <path d="M{X(330)},420 C{X(318)},470 {X(330)},540 {X(392)},572 C{X(372)},520 {X(352)},460 {X(330)},420 Z" fill="{SHADE}" stroke="none" opacity="0.9"/>')
    A(f'    <path d="M{X(306)},520 C{X(318)},640 {X(334)},720 {X(336)},800 C{X(326)},720 {X(312)},640 {X(306)},520 Z" fill="{SHADE}" stroke="none"/>')
    A(f'    <path d="M{X(214)},430 C{X(232)},452 {X(252)},462 {X(276)},462" stroke="#e0b39b" stroke-width="3"/>')  # deltoid edge
    A(f'    <path d="M{X(206)},700 C{X(228)},708 {X(252)},708 {X(272)},700" stroke="#e0b39b" stroke-width="3"/>')  # elbow
    # knuckles / fingers on hands
    A(f'    <path d="M{X(226)},1132 L{X(230)},1158 M{X(246)},1134 L{X(248)},1164 M{X(264)},1132 L{X(266)},1162" stroke="#d7a58c" stroke-width="2"/>')
    # erector spinae ridges
    A(f'    <path d="M{X(474)},600 C{X(466)},720 {X(462)},860 {X(470)},990" stroke="#ecc0a8" stroke-width="3"/>')
    # waist crease
    A(f'    <path d="M{X(336)},820 C{X(350)},830 {X(364)},832 {X(378)},830" stroke="#e0b39b" stroke-width="2"/>')
# spinal groove
A('    <path d="M500,262 L500,1000" stroke="#e7b9a1" stroke-width="3"/>')
# nape hairline shadow
A(f'    <path d="M436,214 C470,224 530,224 564,214 L564,230 C530,240 470,240 436,230 Z" fill="{SHADE}" stroke="none"/>')
A('  </g>')

# ---------------------------------------------------------------- hair (back of head + bun)
A(f'  <g id="hair" stroke-linejoin="round" stroke-linecap="round">')
A(f'    <path d="M500,22 C562,22 602,70 602,128 C602,172 584,204 558,218 C538,212 520,210 500,214 '
  f'C480,210 462,212 442,218 C416,204 398,172 398,128 C398,70 438,22 500,22 Z" fill="{HAIR}"/>')
A(f'    <path d="M454,214 L458,226 M476,212 L479,225 M500,214 L500,227 M524,212 L521,225 M546,214 L542,226" stroke="{HAIR}" stroke-width="3"/>')
A('    <g fill="none" stroke="#6b4434" stroke-width="2" opacity="0.6">')
A('      <path d="M424,96 C442,140 454,176 470,206"/>')
A('      <path d="M576,96 C558,140 546,176 530,206"/>')
A('      <path d="M410,142 C420,172 432,192 446,208"/>')
A('      <path d="M590,142 C580,172 568,192 554,208"/>')
A('    </g>')
A(f'    <circle cx="500" cy="100" r="50" fill="{HAIR}" stroke="#2f2420" stroke-width="3"/>')
A('    <path d="M466,86 C482,68 518,68 534,86 M462,108 C482,126 518,126 538,108" fill="none" stroke="#6b4434" stroke-width="2.5" opacity="0.7"/>')
A('    <path d="M466,140 C488,151 512,151 534,140" fill="none" stroke="#e8b46a" stroke-width="7"/>')
A('  </g>')

# ---------------------------------------------------------------- landmarks
A('  <g id="landmarks" fill="none" stroke="#c9967c" stroke-linecap="round" stroke-linejoin="round">')
# scapulae
scap_L = ("M408,372 C380,374 330,382 296,394 C286,420 286,440 290,460 "
          "C316,500 368,540 412,560 C410,500 404,440 404,404 C404,390 406,380 408,372 Z")
spine_L = "M404,410 C370,392 310,356 266,330"
acrom_L = "M266,330 C258,322 246,322 240,330 C236,340 246,346 262,342"
for side, sc, sp, ac in (('left', scap_L, spine_L, acrom_L), ('right', mirror(scap_L), mirror(spine_L), mirror(acrom_L))):
    A(f'    <path id="scapula-{side}" d="{sc}" stroke-width="3" fill="#efc7b0" fill-opacity="0.35"/>')
    A(f'    <path id="scapula-spine-{side}" d="{sp}" stroke-width="3"/>')
    A(f'    <path id="acromion-{side}" d="{ac}" stroke-width="3"/>')
# iliac crests (peak ~ L4)
crest_L = "M300,980 C318,944 356,920 398,918 C430,918 452,930 462,946"
A(f'    <path id="iliac-crest-left" d="{crest_L}" stroke-width="3"/>')
A(f'    <path id="iliac-crest-right" d="{mirror(crest_L)}" stroke-width="3"/>')
# spinous processes
A('    <g id="spinous-processes" fill="#efc7b0" stroke-width="2.5">')
for vid, y in VERT:
    if vid == 'C7':
        A(f'      <ellipse id="sp-{vid}" cx="500" cy="{y}" rx="13" ry="10" stroke-width="3"/>')
    else:
        rx = 9 if vid.startswith('T') else 11
        A(f'      <ellipse id="sp-{vid}" cx="500" cy="{y}" rx="{rx}" ry="7"/>')
A('    </g>')
A('  </g>')

# ---------------------------------------------------------------- muscles
trap_L = [(497, 222), (440, 220), (432, 258), (418, 280), (360, 292), (300, 302), (262, 316),
          (250, 334), (268, 342), (320, 362), (380, 386), (440, 380), (497, 372)]
lev_L = [(452, 228), (466, 232), (462, 280), (436, 330), (414, 384), (398, 384), (412, 330), (440, 276)]
A('  <g id="muscles" fill="#d98a83" fill-opacity="0.35" stroke="#c0605a" stroke-width="2" stroke-linejoin="round">')
A(f'    <polygon id="m-trapezius-left" points="{poly_attr(trap_L)}"/>')
A(f'    <polygon id="m-trapezius-right" points="{poly_attr(mirror_pts(trap_L))}"/>')
A(f'    <polygon id="m-levator-scapulae-left" points="{poly_attr(lev_L)}" fill="#c96f68"/>')
A(f'    <polygon id="m-levator-scapulae-right" points="{poly_attr(mirror_pts(lev_L))}" fill="#c96f68"/>')
A('  </g>')

# ---------------------------------------------------------------- guides
USED = ['C7', 'T1', 'T2', 'T3', 'T7', 'T9', 'T11', 'L2']
A('  <g id="guides" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" fill="none" opacity="0.8">')
A('    <line id="guide-midline" x1="500" y1="226" x2="500" y2="990"/>')
A(f'    <line id="guide-bladder-left" x1="{MID-BL_OFF:g}" y1="330" x2="{MID-BL_OFF:g}" y2="990"/>')
A(f'    <line id="guide-bladder-right" x1="{MID+BL_OFF:g}" y1="330" x2="{MID+BL_OFF:g}" y2="990"/>')
A(f'    <line id="guide-3cun-left" x1="{SCAP_MEDIAL:g}" y1="380" x2="{SCAP_MEDIAL:g}" y2="560" stroke-dasharray="4 8"/>')
A(f'    <line id="guide-3cun-right" x1="{1000-SCAP_MEDIAL:g}" y1="380" x2="{1000-SCAP_MEDIAL:g}" y2="560" stroke-dasharray="4 8"/>')
for vid in USED:
    y = VY[vid] + (0 if vid == 'C7' else BELOW)
    A(f'    <line id="level-{vid}" x1="420" y1="{y}" x2="580" y2="{y}" stroke-dasharray="6 6" stroke-width="2"/>')
A('    <line id="level-acromion-c7" x1="500" y1="300" x2="252" y2="326" stroke-dasharray="6 6" stroke-width="2"/>')
A('    <line id="level-acromion-c7-right" x1="500" y1="300" x2="748" y2="326" stroke-dasharray="6 6" stroke-width="2"/>')
A('  </g>')
A('</svg>')
svg_text = '\n'.join(svg) + '\n'

# ---------------------------------------------------------------- JSON
pts = []
pts.append(dict(id='GV14', name='Đại Chùy', side='center', x=nx(500), y=ny(VY['C7'] + BELOW), r=0.022,
                variant=None, note='chỗ lõm dưới mỏm gai C7 (đốt nhô cao nhất)'))
gb = ((500 + ACROMION[0]) / 2, (VY['C7'] + ACROMION[1]) / 2)
for side, x in (('left', gb[0]), ('right', 1000 - gb[0])):
    pts.append(dict(id='GB21', name='Kiên Tỉnh', side=side, x=nx(x), y=ny(gb[1]), r=0.024, variant=None,
                    note='điểm giữa đường nối mỏm gai C7 và đầu ngoài mỏm cùng vai; thận trọng với thai phụ'))
BL = [('BL11', 'Đại Trữ', 'T1'), ('BL12', 'Phong Môn', 'T2'), ('BL13', 'Phế Du', 'T3'),
      ('BL17', 'Cách Du', 'T7'), ('BL18', 'Can Du', 'T9'), ('BL20', 'Tỳ Du', 'T11'), ('BL23', 'Thận Du', 'L2')]
for code, name, v in BL:
    r = 0.016 if code in ('BL11', 'BL12', 'BL13') else 0.02
    for side, x in (('left', MID - BL_OFF), ('right', MID + BL_OFF)):
        pts.append(dict(id=code, name=name, side=side, x=nx(x), y=ny(VY[v] + BELOW), r=r, variant=None,
                        note=f'ngang bờ dưới mỏm gai {v}, cách đường giữa 1,5 thốn'))
pts.append(dict(id='GV4', name='Mệnh Môn', side='center', x=nx(500), y=ny(VY['L2'] + BELOW), r=0.018,
                variant=None, note='chỗ lõm dưới mỏm gai L2'))

def mus(mid, name, side, poly, strokes):
    return dict(id=mid, name=name, side=side, svgPath=f'm-{mid}-{side}', polygon=[npt(p) for p in poly],
                strokes=[dict(**{'from': npt(a), 'to': npt(b)}) for a, b in strokes],
                maxAngleDeg=30, minLengthRatio=0.6)

trap_strokes_L = [((470, 228), (466, 300)), ((440, 300), (290, 326))]
lev_strokes_L = [((458, 242), (408, 372))]
def mstrokes(ss):
    return [((1000 - a[0], a[1]), (1000 - b[0], b[1])) for a, b in ss]
muscles = [
    mus('trapezius', 'Cơ thang (phần trên)', 'left', trap_L, trap_strokes_L),
    mus('trapezius', 'Cơ thang (phần trên)', 'right', mirror_pts(trap_L), mstrokes(trap_strokes_L)),
    mus('levator-scapulae', 'Cơ nâng vai', 'left', lev_L, lev_strokes_L),
    mus('levator-scapulae', 'Cơ nâng vai', 'right', mirror_pts(lev_L), mstrokes(lev_strokes_L)),
]
data = {
    'view': 'V06', 'title': 'Lưng (nằm sấp)', 'svg': 'V06.svg',
    'frame': {'width': 1000, 'height': 1400},
    'variants': {},
    'sideConvention': 'customer: "left"/"right" = bên trái/phải CỦA KHÁCH (giải phẫu), không phải bên màn hình',
    'midlineX': 0.5,
    'cun': {'unitsPerCun': round(CUN / W, 4),
            'reference': 'thốn theo tỉ lệ xương: đường giữa lưng → bờ trong xương bả vai = 3 thốn (x 0.500 → 0.404, 96 px) ⇒ 1 thốn = 32 px; 1,5 thốn = 48 px ⇒ đường Bàng quang x 0.452 / 0.548'},
    'landmarksRef': {
        'acromion': {'left': npt(ACROMION), 'right': npt((1000 - ACROMION[0], ACROMION[1]))},
        'scapulaInferiorAngleLevel': 'T7', 'iliacCrestLevel': 'L4',
        'pointYRule': 'huyệt Du đặt ngang bờ dưới mỏm gai = tâm mỏm gai + 17 px'
    },
    'vertebrae': [dict(id=v, x=nx(500), y=ny(y)) for v, y in VERT],
    'points': pts,
    'muscles': muscles,
    'forbidden': [],
    'zones': [],
}
os.makedirs(OUT, exist_ok=True)
open(f'{OUT}/V06.svg', 'w', encoding='utf-8').write(svg_text)
data['screenLeftIs'] = 'customer-left'  # khách nằm sấp, nhìn từ trên: trái màn hình = trái của khách
dump_json(f'{OUT}/V06.json', data)
debug_overlay(svg_text, data, f'{SCR}/V06-debug.svg')
print('ok', len(pts), 'points')
