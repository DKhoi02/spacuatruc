import sys, math, json
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def mir(pts): return [(1000 - x, y) for x, y in pts]
def sym_closed(right_half):  # right half from top-center down to bottom-center
    return right_half + mir(right_half[::-1])[1:-1]

HAIRLINE_Y = 835.0
VCUN = 97.0                    # vertical cun on the neck: posterior hairline -> GV14 = 3 cun
MASTOID_TIP = (737, 800)
HCUN = (MASTOID_TIP[0] - (1000 - MASTOID_TIP[0])) / 9.0   # between mastoid processes = 9 cun
EOP = (500, 690)
C2 = (500, 805); C7 = (500, HAIRLINE_Y + 3*VCUN - 30)

HEAD_R = [(500,240),(640,262),(745,330),(790,450),(786,580),(770,690),(748,770),(712,830),(700,880),(690,896),(500,905)]
NECK_R = [(500,770),(740,770),(712,830),(700,880),(704,950),(728,1002),(820,1046),(940,1096),(1020,1140),(1080,1180),(1080,1410),(500,1410)]
HAIR_R = [(500,212),(600,228),(700,262),(780,340),(808,450),(806,560),(790,640)]   # outer silhouette (right half, top->down)
HAIRLINE_R = [(752,668),(746,720),(724,758),(690,790),(640,812),(580,826),(530,832),(500,838)]
EAR_R = [(784,560),(822,575),(846,615),(848,670),(834,725),(810,768),(784,780),(770,740)]

TRAP_R = [(570,700),(560,785),(578,880),(620,948),(684,992),(760,1028)]
SCM_R = [(742,790),(716,860),(698,920)]
NUCHAL_R = [(500,690),(590,698),(668,722),(722,756)]
OCC_LOWER_R = [(500,706),(560,714),(625,730),(690,758)]

P = {
 'GV16': (500, HAIRLINE_Y - VCUN),
 'GB20': (630, HAIRLINE_Y - VCUN + 14),   # ~2,5 thốn ngang; ngay dưới bờ xương chẩm
 'BL10': (500 + 1.3*HCUN, C2[1] - 18),
 'GV14': (500, HAIRLINE_Y + 3*VCUN),
}

def svg():
    o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">',
         '<g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>',
         '<g id="base" stroke="#9a6a52" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">']
    o.append('<path d="%s" fill="%s" stroke="none"/>' % (smooth(sym_closed(NECK_R), True), SKIN))
    # neck/shoulder outline strokes
    for e in (EAR_R, mir(EAR_R)):
        o.append('<path d="%s" fill="%s"/>' % (smooth(e, True), SKIN))
    o.append('<path d="%s" fill="%s" stroke="none"/>' % (smooth(sym_closed(HEAD_R), True), SKIN))
    o.append('<path d="%s" fill="none"/>' % smooth([(790,450),(786,580),(770,690),(748,770)] + NECK_R[2:10]))
    o.append('<path d="%s" fill="none"/>' % smooth(mir([(790,450),(786,580),(770,690),(748,770)] + NECK_R[2:10])))
    o.append('</g>')
    o.append('<g id="skin-detail" fill="none" stroke-linecap="round">')
    o.append('<path d="M500 880 C 498 940 498 1000 500 1060" stroke="#d9a890" stroke-width="10" opacity="0.45"/>')  # nuchal furrow
    for e in (EAR_R, mir(EAR_R)):
        sg = 1 if e[0][0] > 500 else -1
        o.append('<path d="M%s 600 C %s 640 %s 700 %s 745" stroke="#c9967c" stroke-width="3"/>' % (f(500+sg*305), f(500+sg*328), f(500+sg*326), f(500+sg*305)))
    o.append('<path d="M330 1180 C 380 1220 420 1240 460 1250 M670 1180 C 620 1220 580 1240 540 1250" stroke="#d9a890" stroke-width="3" opacity="0.6"/>')
    o.append('</g>')
    o.append('<g id="hair" stroke-linecap="round" stroke-linejoin="round">')
    hair = HAIR_R + HAIRLINE_R
    o.append('<path d="%s" fill="%s"/>' % (smooth(hair + mir(hair[::-1])[1:-1], True, t=0.14), HAIR))
    o.append('<ellipse cx="500" cy="196" rx="112" ry="86" fill="%s"/>' % HAIR)
    o.append('<path d="M420 170 C 460 130 545 130 585 172 M410 215 C 460 180 545 182 592 218" fill="none" stroke="#2f2420" stroke-width="3"/>')
    o.append('<path d="M420 268 C 460 286 540 286 580 268" fill="none" stroke="#8fb39a" stroke-width="13"/>')
    for x0, y0 in [(520,834),(580,826),(645,810),(700,786),(740,735),(785,600)]:
        for sg in (1, -1):
            xa = 500 + sg*(x0-500)
            o.append('<path d="M%s %s C %s %s %s %s %s %s" fill="none" stroke="#2f2420" stroke-width="3" opacity="0.85"/>' % (
                f(xa), f(y0 - 8), f(500 + sg*(x0-500)*1.02), f(y0 - 200), f(500 + sg*(x0-500)*0.55), f(380), f(500 + sg*35), f(290)))
    o.append('<path d="M640 760 C 650 600 600 420 560 300 M360 760 C 350 600 400 420 440 300" fill="none" stroke="#6b4434" stroke-width="14" opacity="0.4"/>')
    o.append('</g>')
    o.append('<g id="features" fill="none" stroke-linecap="round" stroke-linejoin="round">')
    for e in (EAR_R, mir(EAR_R)):
        o.append('<path d="%s" stroke="#9a6a52" stroke-width="4"/>' % smooth(e[:-1]))
    o.append('</g>')
    o.append('<g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" opacity="0.8">')
    o.append('<path id="lm-eop" d="M478 694 C 486 680 514 680 522 694" stroke-width="4"/>')
    o.append('<path id="lm-superior-nuchal-line" d="%s" stroke-dasharray="7 6"/>' % smooth(mir(NUCHAL_R[::-1]) + NUCHAL_R[1:]))
    o.append('<path id="lm-occipital-lower-edge" d="%s"/>' % smooth(mir(OCC_LOWER_R[::-1]) + OCC_LOWER_R[1:]))
    for sg in (1, -1):
        mx = 500 + sg*(MASTOID_TIP[0]-500)
        o.append('<path id="lm-mastoid-%s" d="M%s 748 C %s 772 %s 798 %s %s C %s 796 %s 772 %s 748"/>' % (
            'right' if sg > 0 else 'left', f(mx - sg*22), f(mx - sg*20), f(mx - sg*8), f(mx), f(MASTOID_TIP[1]), f(mx + sg*10), f(mx + sg*12), f(mx + sg*8)))
    o.append('<ellipse id="lm-c2-spinous" cx="%s" cy="%s" rx="16" ry="12"/>' % (f(C2[0]), f(C2[1])))
    for k, yy in enumerate([855, 900, 945, 990]):
        o.append('<ellipse cx="500" cy="%s" rx="9" ry="7" opacity="0.45"/>' % f(yy + (C7[1]-1060)*k/4 if False else yy + k*12))
    o.append('<ellipse id="lm-c7-spinous" cx="%s" cy="%s" rx="20" ry="14" stroke-width="4"/>' % (f(C7[0]), f(C7[1])))
    o.append('<ellipse id="lm-t1-spinous" cx="500" cy="%s" rx="15" ry="11" opacity="0.6"/>' % f(C7[1] + 62))
    o.append('<path id="lm-trapezius-right" d="%s"/>' % smooth(TRAP_R))
    o.append('<path id="lm-trapezius-left" d="%s"/>' % smooth(mir(TRAP_R)))
    o.append('<path id="lm-scm-right" d="%s"/>' % smooth(SCM_R))
    o.append('<path id="lm-scm-left" d="%s"/>' % smooth(mir(SCM_R)))
    o.append('</g>')
    o.append('<g id="guides" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" fill="none" opacity="0.8">')
    o.append('<line id="g-midline" x1="500" y1="560" x2="500" y2="1260"/>')
    hl = mir(HAIRLINE_R) + HAIRLINE_R[::-1][1:]
    o.append('<path id="g-posterior-hairline" d="%s"/>' % smooth(hl))
    o.append('<g id="g-cun-ticks" stroke-dasharray="none" stroke-width="3">')
    for k in range(-1, 4):
        yy = HAIRLINE_Y + k*VCUN
        o.append('<line x1="486" y1="%s" x2="514" y2="%s"/>' % (f(yy), f(yy)))
    o.append('</g></g>')
    o.append('</svg>')
    return "\n".join(o)

s = svg()
data = {"view": "V04", "title": "Sau đầu và gáy", "svg": "V04.svg", "frame": {"width": 1000, "height": 1400},
        "sideConvention": 'customer: "left"/"right" = bên trái/phải CỦA KHÁCH (giải phẫu), không phải bên màn hình', "orientation": "Nhìn từ phía sau: bên trái màn hình = bên TRÁI của khách (cùng chiều người nhìn).",
        "variants": {}, "midlineX": 0.5,
        "cun": {"unitsPerCun": round(VCUN/1000, 4), "unitsPerCunHorizontal": round(HCUN/1000, 4),
                "reference": "Dọc: chân tóc gáy → Đại Chùy (dưới mỏm gai C7) = 3 thốn (y %.4f → %.4f), 1 thốn = %d đơn vị. Ngang: giữa hai mỏm chũm = 9 thốn (1 thốn ngang = %.1f đơn vị); Thiên Trụ cách đường giữa 1,3 thốn ngang." % (ny(HAIRLINE_Y), ny(HAIRLINE_Y + 3*VCUN), VCUN, HCUN)},
        "landmarksSvg": {"externalOccipitalProtuberance": npt(EOP), "c2Spinous": npt(C2), "c7Spinous": npt(C7),
                         "mastoidTipLeft": npt((1000-MASTOID_TIP[0], MASTOID_TIP[1])), "mastoidTipRight": npt(MASTOID_TIP),
                         "posteriorHairlineMid": npt((500, HAIRLINE_Y))},
        "points": [], "muscles": [], "forbidden": [], "zones": []}
def add(pid, name, side, xy, r, note):
    data["points"].append({"id": pid, "name": name, "side": side, "x": nx(xy[0]), "y": ny(xy[1]), "r": r, "variant": None, "note": note})
add("GV16", "Phong Phủ", "center", P['GV16'], 0.026, "Thẳng dưới ụ chẩm ngoài, vào trong chân tóc gáy 1 thốn, chỗ lõm giữa hai cơ thang.")
for side, sg in (("left", -1), ("right", 1)):
    add("GB20", "Phong Trì", side, (500 + sg*(P['GB20'][0]-500), P['GB20'][1]), 0.026, "Dưới xương chẩm, ngang Phong Phủ, chỗ lõm giữa đầu trên cơ ức đòn chũm và cơ thang.")
for side, sg in (("left", -1), ("right", 1)):
    add("BL10", "Thiên Trụ", side, (500 + sg*(P['BL10'][0]-500), P['BL10'][1]), 0.024, "Ngang bờ trên mỏm gai C2, bờ ngoài cơ thang, cách đường giữa 1,3 thốn.")
add("GV14", "Đại Chùy", "center", P['GV14'], 0.026, "Chỗ lõm dưới mỏm gai đốt sống cổ C7.")
open(OUT + '/V04.svg', 'w').write(s)
data["screenLeftIs"] = "customer-left"
open(OUT + '/V04.json', 'w').write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
print("overlaps", check_overlaps(data), "HCUN", HCUN)
for p in data['points']: print(p['id'], p['side'], round(p['x']*1000), round(p['y']*1400))
clean = s.replace('<g id="guides"', '<g id="guides" style="display:none"').replace('<g id="landmarks"', '<g id="landmarks" style="display:none"')
open(SCR + '/V04-clean.svg', 'w').write(clean); render(SCR + '/V04-clean.svg', SCR + '/V04-clean.png')
debug_overlay(s, data, SCR + '/V04-debug.svg'); render(SCR + '/V04-debug.svg', SCR + '/V04-debug.png')
hair = HAIR_R + HAIRLINE_R
json.dump({"hair": hair + mir(hair[::-1])[1:-1], "bun": [500, 196, 112, 86]}, open(SCR + '/v04-geom.json', 'w'))
