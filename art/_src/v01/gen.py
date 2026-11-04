#!/usr/bin/env python3
"""Generator for V01.svg / V01.json / V13.svg (frontal face treatment view)."""
import json, math, re, random, sys, os

OUT = "/Users/dangkhoi/Documents/Project/spa_web_game/art/views"
SCR = os.path.dirname(os.path.abspath(__file__))
W, H = 1000, 1400

def mx(x):
    return 1000 - x

def mirror_path(d):
    """Mirror an absolute path made of M/C/L/Q/Z with x,y pairs."""
    toks = re.findall(r"[MCLQSZz]|-?\d+(?:\.\d+)?", d)
    out, idx = [], 0
    for t in toks:
        if t in "MCLQSZz":
            out.append(t); idx = 0
        else:
            v = float(t)
            if idx % 2 == 0:
                v = 1000 - v
            idx += 1
            out.append(f"{v:g}")
    return " ".join(out)

def smooth_closed(pts, tension=1.0):
    """Catmull-Rom closed curve through pts -> cubic bezier path."""
    n = len(pts)
    d = f"M{pts[0][0]:g} {pts[0][1]:g}"
    for i in range(n):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension)
        d += f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:g} {p2[1]:g}"
    return d + " Z"

def ellipse_pts(cx, cy, rx, ry, n=20, start=0.0):
    return [(round(cx + rx * math.cos(start + 2 * math.pi * i / n), 1),
             round(cy + ry * math.sin(start + 2 * math.pi * i / n), 1)) for i in range(n)]

def mpts(pts):
    return [(mx(x), y) for x, y in pts]

def nx(x): return round(x / W, 4)
def ny(y): return round(y / H, 4)
def npt(p): return [nx(p[0]), ny(p[1])]

SKIN = 'var(--skin, #f3d2bd)'
SHADE = 'var(--skin-shade, #efc7b0)'
HAIR = 'var(--hair, #3b2a24)'
OL = '#9a6a52'

# ---------------------------------------------------------------- geometry
FACE = ("M500 235 C690 235 790 380 785 580 C782 690 770 790 735 870 C690 945 600 975 500 975 "
        "C400 975 310 945 265 870 C230 790 218 690 215 580 C210 380 310 235 500 235 Z")
NECK = ("M335 900 C340 1010 330 1090 300 1150 C230 1180 120 1210 60 1260 L60 1400 L940 1400 L940 1260 "
        "C880 1210 770 1180 700 1150 C670 1090 660 1010 665 900 Z")
EAR_L = "M222 612 C182 592 164 640 170 692 C176 744 192 786 226 798 Z"
EAR_L_IN1 = "M206 636 C190 650 188 690 196 726 C202 752 210 768 220 776"
EAR_L_IN2 = "M214 690 C206 700 206 716 214 726"
HAIRLINE_L = "M215 600 C222 545 236 500 262 468 C320 432 420 418 500 418"
HAIR_D = ("M215 600 C205 360 320 195 500 195 C680 195 795 360 785 600 "
        "C778 545 764 500 738 468 C680 432 580 418 500 418 C420 418 320 432 262 468 C236 500 222 545 215 600 Z")

def build_svg():
    s = []
    a = s.append
    a('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">')
    a('  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>')
    # ---------------- base
    a(f'  <g id="base" stroke="{OL}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">')
    a(f'    <path d="{NECK}" fill="{SHADE}"/>')
    # spa towel across shoulders/chest
    a('    <path d="M60 1262 C150 1236 250 1224 330 1236 C400 1300 600 1300 670 1236 C750 1224 850 1236 940 1262 L940 1400 L60 1400 Z" fill="#fffaf3" stroke="#8a5f4b"/>')
    a('    <path d="M330 1236 C400 1300 600 1300 670 1236" fill="none" stroke="#8a5f4b" stroke-width="3"/>')
    a('    <path d="M120 1300 C200 1280 260 1278 330 1290 M880 1300 C800 1280 740 1278 670 1290 M400 1340 C460 1352 540 1352 600 1340" fill="none" stroke="#e8d2b8" stroke-width="3"/>')
    for d in (EAR_L, mirror_path(EAR_L)):
        a(f'    <path d="{d}" fill="{SHADE}"/>')
    a(f'    <path d="{FACE}" fill="{SKIN}"/>')
    for d in (EAR_L_IN1, EAR_L_IN2):
        a(f'    <path d="{d}" fill="none" stroke-width="3"/>')
        a(f'    <path d="{mirror_path(d)}" fill="none" stroke-width="3"/>')
    a('  </g>')
    # ---------------- skin detail
    a('  <g id="skin-detail" fill="none" stroke-linecap="round">')
    a('    <path d="M345 905 C400 990 600 990 655 905 C640 960 580 1000 500 1002 C420 1000 360 960 345 905 Z" fill="#c9967c" fill-opacity="0.22" stroke="none"/>')
    a('    <path d="M300 1150 C360 1170 430 1176 480 1172 M700 1150 C640 1170 570 1176 520 1172" stroke="#c9967c" stroke-width="3" opacity="0.6"/>')
    a('    <ellipse cx="330" cy="790" rx="48" ry="26" fill="#e9a99b" fill-opacity="0.22"/>')
    a('    <ellipse cx="670" cy="790" rx="48" ry="26" fill="#e9a99b" fill-opacity="0.22"/>')
    a('  </g>')
    # ---------------- hair
    a('  <g id="hair" stroke-linecap="round" stroke-linejoin="round">')
    a(f'    <ellipse cx="500" cy="175" rx="95" ry="70" fill="{HAIR}"/>')
    a(f'    <path d="{HAIR_D}" fill="{HAIR}"/>')
    a('    <g fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="4">')
    a('      <path d="M500 230 C420 250 330 310 290 420 M500 230 C580 250 670 310 710 420"/>')
    a('      <path d="M470 240 C400 280 350 340 330 430 M530 240 C600 280 650 340 670 430"/>')
    a('      <path d="M440 140 C470 120 530 120 560 140 M430 175 C460 160 540 160 570 175"/>')
    a('    </g>')
    a('    <path d="M500 196 L500 236" stroke="#000000" stroke-opacity="0.18" stroke-width="3" fill="none"/>')
    a('  </g>')
    # ---------------- features (nose only; eyes/brows/mouth live in state groups)
    a('  <g id="features" fill="none" stroke-linecap="round" stroke-linejoin="round">')
    a('    <path d="M470 640 C468 700 456 742 446 770" stroke="#c9967c" stroke-width="4"/>')
    a(f'    <path d="M446 770 C428 790 452 802 474 793 C490 801 510 801 526 793 C548 802 572 790 554 770" stroke="{OL}" stroke-width="4"/>')
    a('    <path d="M478 786 C484 790 490 790 494 788 M522 788 C510 790 516 790 522 786" stroke="#c9967c" stroke-width="3"/>')
    a('  </g>')
    # ---------------- landmarks
    orb = "M454 620 C440 596 350 580 300 606 C278 625 280 670 300 690 C330 702 400 704 440 688"
    zyg = "M372 758 C350 770 332 773 312 771 C285 768 262 744 226 716"
    ang = "M244 815 C252 845 262 866 286 892"
    nlab = "M450 750 C440 765 434 778 431 792 C420 815 408 838 404 858"
    a('  <g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" opacity="0.55">')
    for name, d in (("orbital-rim", orb), ("zygomatic", zyg), ("mandible-angle", ang), ("nasolabial", nlab)):
        a(f'    <path id="lm-{name}-left" d="{d}"/>')
        a(f'    <path id="lm-{name}-right" d="{mirror_path(d)}"/>')
    a('    <path id="lm-mentolabial" d="M462 920 C480 913 520 913 538 920"/>')
    a('    <path id="lm-philtrum" d="M488 846 L492 802 M512 846 L508 802"/>')
    a('  </g>')
    # ---------------- muscles
    a('  <g id="muscles" fill="#d98a83" fill-opacity="0.35" stroke="#b8665f" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round">')
    for m in MUSCLES:
        fr = ' fill-rule="evenodd"' if m.get("ring") else ""
        a(f'    <path id="m-{m["svg"]}" d="{m["d"]}"{fr}/>')
    a('    <g id="muscle-fibers" fill="none" stroke="#b8665f" stroke-width="1.5" stroke-opacity="0.45" stroke-linecap="round">')
    for d in FIBERS:
        a(f'      <path d="{d}"/>')
    a('    </g>')
    a('  </g>')
    # ---------------- guides
    a('  <g id="guides" fill="none" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" stroke-linecap="round" opacity="0.8">')
    a('    <path id="g-midline" d="M500 360 L500 1000"/>')
    a('    <path id="g-pupil-left" d="M380 470 L380 830"/>')
    a('    <path id="g-pupil-right" d="M620 470 L620 830"/>')
    a(f'    <path id="g-hairline" d="{HAIRLINE_L} {mirror_path("M500 418 C420 418 320 432 262 468 C236 500 222 545 215 600").replace("M500 418 ", "")}"/>')
    a('    <path id="g-brow-line" d="M262 586 L738 586"/>')
    a('  </g>')
    # ---------------- states: eyes
    eye_l = "M440 652 C410 622 350 622 320 648 C350 670 410 672 440 652 Z"
    lash_l = "M442 651 C410 619 350 619 316 647"
    a('  <g id="state-eyes-open" stroke-linecap="round" stroke-linejoin="round">')
    for d, cx in ((eye_l, 380), (mirror_path(eye_l), 620)):
        a(f'    <path d="{d}" fill="#ffffff" stroke="#5a3d30" stroke-width="4"/>')
        a(f'    <circle cx="{cx}" cy="649" r="19" fill="#6b4a3a"/><circle cx="{cx}" cy="649" r="8" fill="#1e1410"/>')
        a(f'    <circle cx="{cx + 6}" cy="643" r="4" fill="#ffffff"/>')
    for d in (lash_l, mirror_path(lash_l)):
        a(f'    <path d="{d}" fill="none" stroke="#3d2c25" stroke-width="5"/>')
    for d in ("M424 636 C432 616 400 608 360 610 C340 612 326 620 318 630", ):
        pass
    a('    <path d="M430 628 C405 608 352 606 322 626 M570 628 C595 608 648 606 678 626" fill="none" stroke="#c9967c" stroke-width="2.5" opacity="0.7"/>')
    a('  </g>')
    closed_l = "M440 651 C410 668 350 668 320 648"
    a('  <g id="state-eyes-closed" fill="none" stroke-linecap="round" stroke-linejoin="round">')
    for d in (closed_l, mirror_path(closed_l)):
        a(f'    <path d="{d}" stroke="#3d2c25" stroke-width="5"/>')
    lashes_l = "M342 661 L334 672 M362 665 L357 677 M382 666 L380 679 M402 665 L404 677"
    a(f'    <path d="{lashes_l} {mirror_path(lashes_l)}" stroke="#3d2c25" stroke-width="3"/>')
    a('    <path d="M432 640 C405 620 352 618 324 638 M568 640 C595 620 648 618 676 638" stroke="#c9967c" stroke-width="2.5" opacity="0.7"/>')
    a('  </g>')
    # ---------------- states: mouth
    up = "M410 862 C450 844 480 842 500 851 C520 842 550 844 590 862 C545 870 455 870 410 862 Z"
    lo = "M410 862 C455 870 545 870 590 862 C550 895 450 895 410 862 Z"
    a('  <g id="state-mouth-closed" stroke-linecap="round" stroke-linejoin="round">')
    a(f'    <path d="{up}" fill="#d98a83" stroke="#a55a54" stroke-width="3"/>')
    a(f'    <path d="{lo}" fill="#e39a92" stroke="#a55a54" stroke-width="3"/>')
    a('    <path d="M470 878 C485 882 515 882 530 878" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/>')
    a('  </g>')
    # clench: pressed thin lips + masseter bulge at jaw
    up_c = "M414 864 C450 852 480 851 500 857 C520 851 550 852 586 864 C545 868 455 868 414 864 Z"
    lo_c = "M414 864 C455 868 545 868 586 864 C550 882 450 882 414 864 Z"
    bulge_fill = "M231 760 C226 790 224 822 234 846 C242 866 254 880 268 884 L272 878 C258 858 246 828 241 790 L238 760 Z"
    bulge_edge = "M231 760 C226 790 224 822 234 846 C242 866 254 880 268 884"
    bulge_inner = "M262 776 C278 800 286 836 282 866"
    a('  <g id="state-mouth-clench" stroke-linecap="round" stroke-linejoin="round">')
    for f, e, i in ((bulge_fill, bulge_edge, bulge_inner), (mirror_path(bulge_fill), mirror_path(bulge_edge), mirror_path(bulge_inner))):
        a(f'    <path d="{f}" fill="{SKIN}" stroke="none"/>')
        a(f'    <path d="{e}" fill="none" stroke="{OL}" stroke-width="4"/>')
        a(f'    <path d="{i}" fill="none" stroke="#c9967c" stroke-width="3" opacity="0.8"/>')
    a(f'    <path d="{up_c}" fill="#d98a83" stroke="#a55a54" stroke-width="3"/>')
    a(f'    <path d="{lo_c}" fill="#e39a92" stroke="#a55a54" stroke-width="3"/>')
    a('    <path d="M404 858 C400 864 400 870 404 876 M596 858 C600 864 600 870 596 876" fill="none" stroke="#c9967c" stroke-width="2.5"/>')
    a('  </g>')
    a('  <g id="state-mouth-open" stroke-linecap="round" stroke-linejoin="round">')
    a('    <path d="M416 866 C460 858 540 858 584 866 C562 904 438 904 416 866 Z" fill="#7a3f3c" stroke="#a55a54" stroke-width="3"/>')
    a('    <path d="M436 866 C470 861 530 861 564 866 L558 874 C528 877 472 877 442 874 Z" fill="#fffaf3"/>')
    a('    <path d="M452 894 C470 880 530 880 548 894 C530 902 470 902 452 894 Z" fill="#d9787a"/>')
    a('    <path d="M410 864 C450 844 480 842 500 851 C520 842 550 844 590 864 C560 860 540 857 500 859 C460 857 440 860 410 864 Z" fill="#d98a83" stroke="#a55a54" stroke-width="3"/>')
    a('    <path d="M412 867 C440 906 560 906 588 867 C574 922 426 922 412 867 Z" fill="#e39a92" stroke="#a55a54" stroke-width="3"/>')
    a('  </g>')
    # ---------------- expressions: brows + small cues
    brow_n = "M440 596 C410 574 340 564 292 600"
    brow_r = "M440 598 C410 580 340 572 292 604"
    brow_p = "M446 586 C416 570 345 570 292 602"
    a('  <g id="expr-relaxed" fill="none" stroke-linecap="round" stroke-linejoin="round">')
    a(f'    <path d="{brow_r} {mirror_path(brow_r)}" stroke="#4a342c" stroke-width="12"/>')
    a('    <ellipse cx="335" cy="788" rx="44" ry="22" fill="#e9a99b" fill-opacity="0.35" stroke="none"/>')
    a('    <ellipse cx="665" cy="788" rx="44" ry="22" fill="#e9a99b" fill-opacity="0.35" stroke="none"/>')
    a('  </g>')
    a('  <g id="expr-neutral" fill="none" stroke-linecap="round" stroke-linejoin="round">')
    a(f'    <path d="{brow_n} {mirror_path(brow_n)}" stroke="#4a342c" stroke-width="12"/>')
    a('  </g>')
    a('  <g id="expr-pain" fill="none" stroke-linecap="round" stroke-linejoin="round">')
    a(f'    <path d="{brow_p} {mirror_path(brow_p)}" stroke="#4a342c" stroke-width="12"/>')
    a('    <path d="M484 572 C482 582 484 594 488 604 M516 572 C518 582 516 594 512 604" stroke="#c9967c" stroke-width="3"/>')
    a('    <path d="M430 500 C460 490 540 490 570 500 M450 530 C475 522 525 522 550 530" stroke="#c9967c" stroke-width="2.5" opacity="0.7"/>')
    a('    <path d="M752 520 C744 536 740 548 746 556 C752 564 764 562 766 552 C768 544 762 534 752 520 Z" fill="#cfe3e6" stroke="#8fb3c6" stroke-width="2"/>')
    a('    <path d="M384 828 C372 834 360 834 350 830 M616 828 C628 834 640 834 650 830" stroke="#c9967c" stroke-width="2.5" opacity="0.7"/>')
    a('  </g>')
    a('</svg>')
    return "\n".join(s)

# ---------------------------------------------------------------- muscles (viewer-left px; right mirrored)
MUSCLE_DEFS = []  # (id, name, polygon_left, strokes_left[(from,to)], bilateral, ring_inner)

frontalis_poly = [(296, 586), (288, 545), (290, 500), (300, 470), (330, 452), (420, 432), (500, 428),
                  (580, 432), (670, 452), (700, 470), (710, 500), (712, 545), (704, 586), (640, 568),
                  (565, 570), (522, 556), (500, 548), (478, 556), (435, 570), (360, 568)]
frontalis_strokes = [((470, 556), (470, 448)), ((530, 556), (530, 448)), ((405, 564), (400, 446)),
                     ((595, 564), (600, 446)), ((330, 566), (310, 480)), ((670, 566), (690, 480))]

L = {
 "corrugator-supercilii": dict(name="Cơ cau mày", poly=[(456, 606), (444, 590), (414, 578), (382, 572), (372, 578), (398, 590), (440, 608)],
                               strokes=[((446, 598), (384, 577))]),
 "orbicularis-oculi": dict(name="Cơ vòng mắt", ring=((378, 652, 98, 72), (380, 649, 66, 26)),
                           strokes=[((448, 606), (288, 618)), ((446, 694), (286, 676))]),
 "temporalis": dict(name="Cơ thái dương", poly=[(248, 456), (280, 474), (282, 540), (272, 610), (256, 676), (240, 704), (224, 694), (219, 620), (222, 530), (232, 476)],
                    strokes=[((262, 480), (244, 676)), ((278, 506), (252, 668))]),
 "masseter": dict(name="Cơ cắn", poly=[(236, 714), (272, 716), (306, 726), (316, 782), (318, 850), (312, 894), (292, 902), (272, 884), (256, 856), (244, 820), (236, 770)],
                  strokes=[((268, 724), (284, 886)), ((296, 734), (304, 880))]),
 "zygomaticus-major": dict(name="Cơ gò má lớn", poly=[(286, 752), (306, 736), (356, 792), (408, 846), (414, 866), (398, 866), (340, 810)],
                           strokes=[((404, 858), (298, 748))]),
 "zygomaticus-minor": dict(name="Cơ gò má nhỏ", poly=[(322, 732), (344, 722), (382, 782), (424, 838), (412, 850), (364, 794)],
                           strokes=[((416, 842), (336, 730))]),
 "levator-labii-superioris": dict(name="Cơ nâng môi trên", poly=[(374, 706), (424, 706), (436, 752), (440, 800), (450, 838), (432, 846), (410, 800), (390, 752)],
                                  strokes=[((440, 836), (404, 716))]),
 "buccinator": dict(name="Cơ mút", poly=[(318, 826), (362, 834), (406, 852), (410, 874), (362, 888), (318, 884)],
                    strokes=[((404, 862), (324, 856))]),
 "depressor-anguli-oris": dict(name="Cơ hạ góc miệng", poly=[(324, 922), (360, 945), (412, 960), (424, 938), (412, 880), (398, 878)],
                               strokes=[((384, 948), (406, 886))]),
 "mentalis": dict(name="Cơ cằm", poly=[(452, 934), (474, 924), (496, 928), (497, 964), (476, 970), (456, 958)],
                  strokes=[((492, 946), (458, 944))]),
}

MUSCLES = []      # for svg
MUSCLE_JSON = []
FIBERS = []

def add_fibers_strap(poly, n=3):
    pass

def build_muscles():
    # frontalis (center)
    MUSCLES.append(dict(svg="frontalis", d=smooth_closed(frontalis_poly)))
    MUSCLE_JSON.append(dict(id="frontalis", name="Cơ trán", latin="Frontalis", side="center", svgPath="m-frontalis",
                            polygon=[npt(p) for p in frontalis_poly],
                            strokes=[{"from": npt(a), "to": npt(b)} for a, b in frontalis_strokes]))
    for x in (330, 380, 430, 475, 525, 570, 620, 670):
        FIBERS.append(f"M{x} {566 if 340 < x < 660 else 572} C{x - 2} 530 {x - 4 if x < 500 else x + 4} 480 {x - 8 if x < 500 else x + 8} 450")
    # orbicularis oris (center ring)
    outer = ellipse_pts(500, 868, 118, 56, 22)
    inner = ellipse_pts(500, 866, 90, 22, 16)
    d = smooth_closed(outer) + " " + smooth_closed(inner)
    MUSCLES.append(dict(svg="orbicularis-oris", d=d, ring=True))
    # keyhole polygon: outer ring CW starting at left (index pointing at angle pi), then inner reversed
    o = ellipse_pts(500, 868, 118, 56, 22, start=math.pi)
    i_ = ellipse_pts(500, 866, 90, 22, 16, start=math.pi)
    poly = o + [o[0]] + [i_[0]] + list(reversed(i_[1:])) + [i_[0]]
    MUSCLE_JSON.append(dict(id="orbicularis-oris", name="Cơ vòng miệng", latin="Orbicularis oris", side="center",
                            svgPath="m-orbicularis-oris", polygon=[npt(p) for p in poly],
                            strokes=[{"from": npt((494, 834)), "to": npt((418, 852))}, {"from": npt((506, 834)), "to": npt((582, 852))},
                                     {"from": npt((494, 902)), "to": npt((418, 880))}, {"from": npt((506, 902)), "to": npt((582, 880))}]))
    for k in (0.35, 0.7):
        FIBERS.append(smooth_closed(ellipse_pts(500, 867, 90 + 28 * k, 22 + 34 * k, 22)).replace(" Z", " Z"))
    latin = {"corrugator-supercilii": "Corrugator supercilii", "orbicularis-oculi": "Orbicularis oculi", "temporalis": "Temporalis",
             "masseter": "Masseter", "zygomaticus-major": "Zygomaticus major", "zygomaticus-minor": "Zygomaticus minor",
             "levator-labii-superioris": "Levator labii superioris", "buccinator": "Buccinator",
             "depressor-anguli-oris": "Depressor anguli oris", "mentalis": "Mentalis"}
    for mid, m in L.items():
        for side in ("left", "right"):
            f = (lambda p: p) if side == "left" else (lambda p: (mx(p[0]), p[1]))
            if "ring" in m:
                (ocx, ocy, orx, ory), (icx, icy, irx, iry) = m["ring"]
                if side == "right":
                    ocx, icx = mx(ocx), mx(icx)
                outer = ellipse_pts(ocx, ocy, orx, ory, 22)
                inner = ellipse_pts(icx, icy, irx, iry, 16)
                d = smooth_closed(outer) + " " + smooth_closed(inner)
                # keyhole seam on the lateral side
                st = math.pi if side == "left" else 0.0
                o = ellipse_pts(ocx, ocy, orx, ory, 22, start=st)
                i_ = ellipse_pts(icx, icy, irx, iry, 16, start=st)
                poly = o + [o[0]] + [i_[0]] + list(reversed(i_[1:])) + [i_[0]]
                MUSCLES.append(dict(svg=f"{mid}-{side}", d=d, ring=True))
                for k in (0.33, 0.66):
                    FIBERS.append(smooth_closed(ellipse_pts(icx + (ocx - icx) * k, icy + (ocy - icy) * k,
                                                            irx + (orx - irx) * k, iry + (ory - iry) * k, 22)))
            else:
                poly = [f(p) for p in m["poly"]]
                d = smooth_closed(poly)
                MUSCLES.append(dict(svg=f"{mid}-{side}", d=d))
                for a, b in m["strokes"]:
                    pass
            strokes = [{"from": npt(f(a)), "to": npt(f(b))} for a, b in m["strokes"]]
            MUSCLE_JSON.append(dict(id=mid, name=m["name"], latin=latin[mid], side=side, svgPath=f"m-{mid}-{side}",
                                    polygon=[npt(p) for p in poly], strokes=strokes))
    # simple fiber lines following stroke directions (offset copies)
    for mid, m in L.items():
        if "ring" in m:
            continue
        for side in ("left", "right"):
            f = (lambda p: p) if side == "left" else (lambda p: (mx(p[0]), p[1]))
            for a, b in m["strokes"]:
                ax, ay = f(a); bx, by = f(b)
                FIBERS.append(f"M{ax:g} {ay:g} L{bx:g} {by:g}")
    for j in MUSCLE_JSON:
        j["maxAngleDeg"] = 30
        j["minLengthRatio"] = 0.6

# ---------------------------------------------------------------- points (viewer-left px)
P = [
 # id, name, side-type, x, y, r(px), variant, note
 ("GV29", "Ấn Đường", "c", 500, 594, 24, None, "Chỗ lõm ở điểm giữa hai đầu trong lông mày"),
 ("BL2", "Toản Trúc", "b", 446, 592, 22, None, "Chỗ lõm ở đầu trong lông mày"),
 ("EX-HN4", "Ngư Yêu", "b", 378, 575, 22, None, "Giữa lông mày, thẳng trên đồng tử"),
 ("TE23", "Ty Trúc Không", "b", 294, 600, 22, None, "Chỗ lõm ở đầu ngoài lông mày"),
 ("EX-HN5", "Thái Dương", "b", 246, 626, 24, None, "Chỗ lõm 1 thốn phía sau điểm giữa đầu ngoài lông mày và khóe mắt ngoài"),
 ("GB14", "Dương Bạch", "b", 380, 516, 24, None, "Trên lông mày 1 thốn, thẳng trên đồng tử"),
 ("BL1", "Tình Minh", "b", 454, 643, 16, None, "Chỗ lõm hơi trên khóe mắt trong, sát thành trong hốc mắt. Ấn rất nhẹ"),
 ("GB1", "Đồng Tử Liêu", "b", 290, 652, 20, None, "Cách khóe mắt ngoài 0,5 thốn về phía ngoài"),
 ("ST1", "Thừa Khấp", "b", 380, 686, 16, None, "Thẳng dưới đồng tử, giữa nhãn cầu và bờ dưới hốc mắt. Ấn rất nhẹ lên bờ xương"),
 ("ST2", "Tứ Bạch", "b", 380, 726, 18, None, "Thẳng dưới đồng tử, tại lỗ dưới hốc mắt"),
 ("ST3", "Cự Liêu", "b", 380, 795, 22, None, "Thẳng dưới đồng tử, ngang bờ dưới cánh mũi"),
 ("SI18", "Quyền Liêu", "b", 322, 772, 22, None, "Thẳng dưới khóe mắt ngoài, chỗ lõm bờ dưới xương gò má"),
 ("EX-HN8", "Thượng Nghinh Hương", "b", 450, 748, 18, None, "Đầu trên rãnh mũi má, chỗ nối sụn cánh mũi và xương mũi"),
 ("LI20", "Nghinh Hương", "b", 430, 784, 18, None, "Trong rãnh mũi má, ngang điểm giữa bờ ngoài cánh mũi"),
 ("GV26", "Thủy Câu", "c", 500, 818, 18, None, "Rãnh nhân trung, chỗ nối 1/3 trên và 1/3 giữa"),
 ("ST4", "Địa Thương", "b", 386, 862, 20, None, "Cách khóe miệng 0,4 thốn về phía ngoài"),
 ("CV24", "Thừa Tương", "c", 500, 918, 22, None, "Chỗ lõm ở giữa rãnh môi cằm"),
 ("ST5", "Đại Nghinh", "b", 322, 901, 18, None, "Trước góc hàm, chỗ lõm bờ trước cơ cắn, nơi có mạch động mạch mặt. Tránh ấn mạnh"),
 ("ST6", "Giáp Xa", "b", 290, 830, 24, None, "1 khoát ngón tay trước-trên góc hàm, trên cơ cắn (cắn chặt thì nổi, thả ra thì lõm)"),
 ("ST7", "Hạ Quan", "b", 247, 744, 22, "mouth-closed", "Trước tai, chỗ lõm giữa bờ dưới cung gò má và khuyết xương hàm dưới (ngậm miệng)"),
 ("GV24", "Thần Đình", "c", 500, 388, 24, None, "Trên đường giữa, vào trong chân tóc trán 0,5 thốn"),
 ("ST8", "Đầu Duy", "b", 268, 440, 24, None, "Vào trong chân tóc góc trán 0,5 thốn, cách đường giữa 4,5 thốn"),
]

def build_points():
    out = []
    for pid, name, t, x, y, r, var, note in P:
        sides = [("center", x)] if t == "c" else [("left", x), ("right", mx(x))]
        for side, xx in sides:
            out.append(dict(id=pid, name=name, side=side, x=nx(xx), y=ny(y), r=round(r / W, 4), variant=var, note=note))
    return out

FORBIDDEN = [
    dict(id="eyeball-left", shape="ellipse", x=nx(380), y=ny(649), rx=round(56 / W, 4), ry=round(18 / H, 4),
         message="Huyệt quanh mắt nằm trên bờ xương hốc mắt, không ấn vào nhãn cầu."),
    dict(id="eyeball-right", shape="ellipse", x=nx(620), y=ny(649), rx=round(56 / W, 4), ry=round(18 / H, 4),
         message="Huyệt quanh mắt nằm trên bờ xương hốc mắt, không ấn vào nhãn cầu."),
    dict(id="facial-artery-left", shape="circle", x=nx(324), y=ny(930), r=round(9 / W, 4),
         message="Đây là chỗ động mạch mặt đi qua bờ xương hàm. Đại Nghinh chỉ ấn nhẹ, không đè mạnh vào động mạch."),
    dict(id="facial-artery-right", shape="circle", x=nx(676), y=ny(930), r=round(9 / W, 4),
         message="Đây là chỗ động mạch mặt đi qua bờ xương hàm. Đại Nghinh chỉ ấn nhẹ, không đè mạnh vào động mạch."),
]

def build_json():
    return {
        "view": "V01",
        "title": "Mặt chính diện",
        "svg": "V01.svg",
        "frame": {"width": 1000, "height": 1400},
        "sideConvention": "viewer (left = bên trái màn hình = bên phải của khách)",
        "variants": {"eyes": ["eyes-open", "eyes-closed"], "mouth": ["mouth-closed", "mouth-clench", "mouth-open"],
                     "expr": ["expr-relaxed", "expr-neutral", "expr-pain"]},
        "defaultVariants": {"eyes": "eyes-open", "mouth": "mouth-closed", "expr": "expr-neutral"},
        "overlays": ["V13.svg"],
        "midlineX": 0.5,
        "cun": {"unitsPerCun": 0.06,
                "reference": "Thốn theo tỉ lệ xương (WHO): chân tóc trán giữa (y 0.2986) → Ấn Đường/giữa hai đầu lông mày (y 0.4243) = 3 thốn; 1 thốn = 60px = 0.06 chiều rộng. Điểm ở xa đường giữa (Đầu Duy 4,5 thốn) đã tính co ngắn do mặt cong khi nhìn chính diện."},
        "points": build_points(),
        "muscles": MUSCLE_JSON,
        "forbidden": FORBIDDEN,
        "zones": [],
    }

# ---------------------------------------------------------------- V13 overlay
def blob(cx, cy, rx, ry, n=14, amp=0.18, seed=0):
    rnd = random.Random(seed)
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + (amp if i % 2 == 0 else -amp * 0.3) * (0.6 + 0.4 * rnd.random())
        pts.append((round(cx + rx * k * math.cos(a), 1), round(cy + ry * k * math.sin(a), 1)))
    return smooth_closed(pts)

def build_v13():
    s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">']
    a = s.append
    # holes (eyes, nostrils, mouth) shared by foam/mask
    eye_hole_l = smooth_closed(ellipse_pts(380, 648, 74, 34, 16))
    eye_hole_r = smooth_closed(ellipse_pts(620, 648, 74, 34, 16))
    nose_hole = "M446 772 C430 792 452 808 476 800 C492 806 508 806 524 800 C548 808 570 792 554 772 C540 760 460 760 446 772 Z"
    mouth_hole = smooth_closed(ellipse_pts(500, 868, 104, 36, 18))
    # ---- foam: soft foam patches on forehead, cheeks, nose, chin
    a('  <g id="foam">')
    rnd = random.Random(7)
    patches = [(500, 500, 190, 62), (320, 760, 70, 80), (680, 760, 70, 80), (500, 720, 26, 50), (500, 940, 70, 24),
               (290, 560, 40, 30), (710, 560, 40, 30), (290, 870, 34, 40), (710, 870, 34, 40)]
    a('    <g fill="#ffffff" fill-opacity="0.88" stroke="#cfe3e6" stroke-width="3" stroke-linejoin="round">')
    for k, (cx, cy, rx, ry) in enumerate(patches):
        a(f'      <path d="{blob(cx, cy, rx, ry, n=16, amp=0.14, seed=k)}"/>')
    a('    </g>')
    a('    <g fill="#ffffff" stroke="#cfe3e6" stroke-width="2">')
    for cx, cy, rx, ry in patches:
        for _ in range(int(3 + rx / 25)):
            ang = rnd.random() * 2 * math.pi; rr = rnd.random() ** 0.5
            x = cx + math.cos(ang) * rx * 0.95 * rr; y = cy + math.sin(ang) * ry * 0.95 * rr
            a(f'      <circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(4, 11):.1f}"/>')
    a('    </g>')
    a('    <g fill="#ffffff" fill-opacity="0.9">')
    for cx, cy, rx, ry in patches:
        a(f'      <circle cx="{cx - rx * 0.35:.0f}" cy="{cy - ry * 0.35:.0f}" r="5"/>')
    a('    </g>')
    a('  </g>')
    # ---- mask: sheet mask with holes
    mask_outer = ("M500 430 C600 430 690 444 742 478 C770 540 778 620 776 700 C772 790 752 860 718 900 "
                  "C670 950 590 968 500 968 C410 968 330 950 282 900 C248 860 228 790 224 700 C222 620 230 540 258 478 C310 444 400 430 500 430 Z")
    a('  <g id="mask">')
    a(f'    <path d="{mask_outer} {eye_hole_l} {eye_hole_r} {nose_hole} {mouth_hole}" fill="#fffaf3" fill-opacity="0.94" fill-rule="evenodd" stroke="#c49a70" stroke-width="3" stroke-linejoin="round"/>')
    a('    <g fill="none" stroke="#e8d2b8" stroke-width="2.5" stroke-linecap="round">')
    a('      <path d="M330 520 C400 500 600 500 670 520 M300 760 C340 740 380 740 400 760 M700 760 C660 740 620 740 600 760 M420 940 C460 950 540 950 580 940"/>')
    a('      <path d="M500 450 L500 590"/>')
    a('    </g>')
    a('  </g>')
    # ---- scrub: speckled exfoliant (thin cream film + granules), avoids eyes, lips
    a('  <g id="scrub">')
    film = [(500, 505, 200, 66), (318, 770, 74, 86), (682, 770, 74, 86), (500, 720, 30, 54), (500, 940, 74, 24)]
    a('    <g fill="#fffaf3" fill-opacity="0.45" stroke="none">')
    for k, (cx, cy, rx, ry) in enumerate(film):
        a(f'      <path d="{blob(cx, cy, rx, ry, n=14, amp=0.08, seed=20 + k)}"/>')
    a('    </g>')
    cols = ["#d8b48c", "#c49a70", "#8fb39a", "#e7b4a6"]
    a('    <g stroke="none">')
    rnd = random.Random(42)
    for cx, cy, rx, ry in film:
        for _ in range(int(rx * ry / 260)):
            ang = rnd.random() * 2 * math.pi; rr = rnd.random() ** 0.5
            x = cx + math.cos(ang) * rx * rr; y = cy + math.sin(ang) * ry * rr
            a(f'      <circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(1.6, 3.4):.1f}" fill="{rnd.choice(cols)}"/>')
    a('    </g>')
    a('  </g>')
    a('</svg>')
    return "\n".join(s)

if __name__ == "__main__":
    build_muscles()
    svg = build_svg()
    data = build_json()
    open(os.path.join(OUT, "V01.svg"), "w").write(svg + "\n")
    open(os.path.join(OUT, "V01.json"), "w").write(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    open(os.path.join(OUT, "V13.svg"), "w").write(build_v13() + "\n")
    print("ok", len(data["points"]), "points", len(data["muscles"]), "muscles")
