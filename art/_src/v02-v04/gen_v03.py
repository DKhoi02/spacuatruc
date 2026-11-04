import sys, math, json
import numpy as np
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

XR, YR, ZR = 8.0, 10.0, 9.5        # cm half-axes (lateral, vertical, antero-posterior)
TAU = math.radians(25)             # head seen from above, tilted toward the face
S = 46.0; CX, CY = 500.0, 600.0
T_ANT, T_POST = 26.5, 228.0        # sagittal angles of anterior/posterior hairline

def surf(theta, phi):  # degrees; theta 0=front, +90 = viewer's right (customer's left)
    th, ph = math.radians(theta), math.radians(phi)
    return (XR*math.cos(ph)*math.sin(th), YR*math.sin(ph), ZR*math.cos(ph)*math.cos(th))
def proj(p):
    X, Y, Z = p
    return (CX + X*S, CY + (Z*math.cos(TAU) - Y*math.sin(TAU))*S)
def visible(p):
    X, Y, Z = p
    return (Y/YR**2)*math.cos(TAU) + (Z/ZR**2)*math.sin(TAU) > 0
def sil_phi(theta):
    return math.degrees(math.atan(-math.cos(math.radians(theta))*math.tan(TAU)*YR/ZR))

# sagittal arc length
def sag(t):  # t degrees in sagittal plane (0=front horizontal, 90=vertex)
    r = math.radians(t); return (0.0, YR*math.sin(r), ZR*math.cos(r))
def arclen(f, a, b, n=2000):
    L = 0; prev = f(a)
    for i in range(1, n+1):
        p = f(a + (b-a)*i/n); L += math.dist(prev, p); prev = p
    return L
TOTAL = arclen(sag, T_ANT, T_POST); CUN = TOTAL/12
def sag_at(cun_from_ant):
    target = cun_from_ant*CUN; L = 0; prev = sag(T_ANT); t = T_ANT
    while L < target:
        t += 0.01; p = sag(t); L += math.dist(prev, p); prev = p
    return t
# hairline (front) as phi(theta)
HL = [(0,26.5),(20,26),(40,24.5),(57,22),(66,14),(74,4),(82,-6),(90,-12)]
def hl_phi(theta):
    a = abs(theta)
    for (t0,p0),(t1,p1) in zip(HL, HL[1:]):
        if t0 <= a <= t1: return p0 + (p1-p0)*(a-t0)/(t1-t0)
    return HL[-1][1]
def meridian_up(theta, phi0, cun):  # move along meridian upward by cun
    target = cun*CUN; L = 0; prev = surf(theta, phi0); ph = phi0
    while L < target:
        ph += 0.01; p = surf(theta, ph); L += math.dist(prev, p); prev = p
    return surf(theta, ph)

t_gv24 = sag_at(0.5); t_gv20 = sag_at(5.0)
GV24 = sag(t_gv24); GV20 = sag(t_gv20)
GV20_front = sag(sag_at(4.0)); GV20_back = sag(sag_at(6.0))
# lateral 1 cun along the coronal section through GV20 (z fixed)
z0 = GV20[2]
def coronal(xx):  # point on ellipsoid with z=z0, lateral x
    yy = YR*math.sqrt(max(0, 1 - (xx/XR)**2 - (z0/ZR)**2)); return (xx, yy, z0)
def lateral(cun, sign):
    L = 0; prev = coronal(0); x = 0
    while L < cun*CUN:
        x += sign*0.001; p = coronal(x); L += math.dist(prev, p); prev = p
    return coronal(x)
GV20_L = lateral(1, +1); GV20_R = lateral(1, -1)
ST8_L = meridian_up(57, hl_phi(57), 0.5); ST8_R = meridian_up(-57, hl_phi(-57), 0.5)
# ear apex: z where GV20 should be (midpoint of ear-apex line)
EAR_Z = z0; EAR_Y = -0.8
ear_apex_x = XR*math.sqrt(1 - (EAR_Y/YR)**2 - (EAR_Z/ZR)**2) + 0.9
print("cun cm", CUN, "GV20 z", z0, "t", t_gv20)

# ---------- outlines ----------
sil = []
for th in np.arange(0, 360, 2):
    sil.append(proj(surf(th, sil_phi(th))))
# hair visible boundary: silhouette over back from theta_a to 360-theta_a, then hairline
def hl_vis(theta):
    return hl_phi(theta) >= sil_phi(theta)
th_a = 0
for th in np.arange(0, 120, 0.5):
    if not hl_vis(th): th_a = th; break
hair_pts = [proj(surf(th, sil_phi(th))) for th in np.arange(th_a, 360 - th_a + 0.1, 2)]
hair_pts += [proj(surf(th, hl_phi(th))) for th in np.arange(-th_a, th_a + 0.1, 2)]

# the face part beyond silhouette: brows on the ellipsoid near front
def pt_on(theta, phi): return proj(surf(theta, phi))
brow_L = [pt_on(t, sil_phi(t) + 7) for t in (7, 15, 23)]
brow_R = [pt_on(-t, sil_phi(-t) + 7) for t in (7, 15, 23)]
front = proj(surf(0, sil_phi(0)))

# hairline + strands
hairline = [proj(surf(th, hl_phi(th))) for th in np.arange(-th_a, th_a + 0.1, 2)]
def in_hair(pt):
    X, Y, Z = pt
    ph = math.degrees(math.asin(max(-1, min(1, Y/YR))))
    th = math.degrees(math.atan2(X/XR, Z/ZR))
    if abs(th) > 100: return True
    return ph >= hl_phi(th) + 1.5
def strand(alpha):
    pts = []
    for z in np.linspace(ZR*0.99, -ZR*0.99, 160):
        k = math.sqrt(max(0, 1 - (z/ZR)**2))
        a = math.radians(alpha)
        pt = (XR*k*math.sin(a), YR*k*math.cos(a), z)
        if in_hair(pt) and visible(pt): pts.append(proj(pt))
        elif pts and not visible(pt): break
    return pts[::6] + ([pts[-1]] if pts else [])
strands = [strand(a) for a in (-80,-66,-52,-38,-24,-11, 11,24,38,52,66,80)]
sheen = [strand(a) for a in (-30, 30)]
part = [proj(sag(t)) for t in np.arange(T_ANT + 0.5, t_gv20 + 6, 1)]

# ears (drawn behind head)
def ear_shape(sign):
    ax = CX + sign*ear_apex_x*S
    ay = proj((0, EAR_Y, EAR_Z))[1]
    # leaf shape: outer rim from front root to back root
    pts = [(CX + sign*(XR-0.6)*S, ay + 55), (ax - sign*6, ay + 40), (ax + sign*4, ay - 2), (ax - sign*4, ay - 40),
           (CX + sign*(XR-0.4)*S, ay - 62)]
    return pts, (ax, ay)
earL, apexL = ear_shape(+1); earR, apexR = ear_shape(-1)

# cun ticks along midline (sagittal), every cun from anterior hairline, only visible
ticks = []
for c in range(0, 13):
    t = sag_at(c) if c > 0 else T_ANT
    p = sag(t)
    if visible(p):
        q = proj(p); ticks.append(q)

def svg():
    o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">',
         '<g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>',
         '<g id="base" stroke="#9a6a52" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">']
    # shoulders (behind head)
    o.append('<path d="M-20 1400 L -20 1060 C 80 990 220 965 330 965 L 670 965 C 780 965 920 990 1020 1060 L 1020 1400 Z" fill="%s"/>' % SHADE)
    o.append('<path d="M120 1120 C 180 1080 250 1062 320 1060 M880 1120 C 820 1080 750 1062 680 1060" fill="none" stroke-width="3" opacity="0.6"/>')
    # nose tip peeking beyond forehead edge
    fx, fy = front
    NOSE = [(fx-30, fy-30), (fx-34, fy+16), (fx-24, fy+40), (fx, fy+48), (fx+24, fy+40), (fx+34, fy+16), (fx+30, fy-30)]
    o.append('<path d="%s" fill="%s"/>' % (smooth(NOSE) + ' Z', SKIN))
    # ears
    for e in (earL, earR):
        o.append('<path d="%s" fill="%s"/>' % (smooth(e), SKIN))
    # head
    o.append('<path d="%s" fill="%s"/>' % (smooth(sil, True), SKIN))
    o.append('</g>')
    o.append('<g id="skin-detail" fill="none" stroke-linecap="round">')
    # nostrils hint & forehead shade
    o.append('<ellipse cx="%s" cy="%s" rx="230" ry="40" fill="#efc7b0" opacity="0.5"/>' % (f(fx), f(fy-28)))
    o.append('</g>')
    o.append('<g id="hair" stroke-linecap="round" stroke-linejoin="round">')
    o.append('<path d="%s" fill="%s"/>' % (smooth(hair_pts, True, t=0.12), HAIR))
    for st in strands:
        if len(st) > 3: o.append('<path d="%s" fill="none" stroke="#2f2420" stroke-width="3" opacity="0.85"/>' % smooth(st))
    for st in sheen:
        if len(st) > 3: o.append('<path d="%s" fill="none" stroke="#6b4434" stroke-width="14" opacity="0.45"/>' % smooth(st[2:-3]))
    o.append('<path d="%s" fill="none" stroke="%s" stroke-width="5"/>' % (smooth(part), SKIN))
    # crown whorl
    w = proj(sag(t_gv20 + 8))
    o.append('<path d="M%s %s c 10 -8 24 -2 22 12 c -2 14 -22 18 -30 6" fill="none" stroke="#2f2420" stroke-width="3"/>' % (f(w[0]-4), f(w[1]-6)))
    o.append('</g>')
    o.append('<g id="features" fill="none" stroke-linecap="round" stroke-linejoin="round">')
    # outlines on top (head silhouette + ears + nose)
    o.append('<path d="%s" stroke="#9a6a52" stroke-width="4"/>' % smooth(sil, True))
    for e in (earL, earR):
        o.append('<path d="%s" stroke="#9a6a52" stroke-width="4"/>' % smooth(e))
    for (ax, ay), sg in ((apexL, 1), (apexR, -1)):
        o.append('<path d="M%s %s C %s %s %s %s %s %s" stroke="#c9967c" stroke-width="3"/>' % (
            f(ax - sg*8), f(ay + 30), f(ax - sg*2), f(ay + 10), f(ax - sg*2), f(ay - 12), f(ax - sg*10), f(ay - 30)))
    o.append('<path d="%s" stroke="#9a6a52" stroke-width="4"/>' % smooth(NOSE[1:-1]))
    o.append('<path d="M%s %s c -6 6 -6 14 0 18 M%s %s c 6 6 6 14 0 18" stroke="#c9967c" stroke-width="3"/>' % (f(fx-22), f(fy+12), f(fx+22), f(fy+12)))
    o.append('<path d="%s" stroke="#4a342c" stroke-width="8"/>' % smooth(brow_L))
    o.append('<path d="%s" stroke="#4a342c" stroke-width="8"/>' % smooth(brow_R))
    o.append('</g>')
    o.append('<g id="guides" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" fill="none" opacity="0.8">')
    mid = [proj(sag(t)) for t in np.arange(-24, 180, 1) if visible(sag(t))]
    o.append('<path id="g-midline" d="%s"/>' % smooth(mid[::4] + [mid[-1]]))
    o.append('<path id="g-anterior-hairline" d="%s"/>' % smooth(hairline))
    # ear-apex line: over the scalp (coronal curve through ear apices)
    cor = [proj(coronal(x)) for x in np.linspace(-XR*0.995, XR*0.995, 60) if visible(coronal(x))]
    o.append('<path id="g-ear-apex-line" d="M%s %s L %s %s %s"/>' % (f(apexR[0]), f(apexR[1]), f(cor[0][0]), f(cor[0][1]), smooth(cor).replace('M', 'L', 1) + ' L %s %s' % (f(apexL[0]), f(apexL[1]))))
    o.append('<g id="g-cun-ticks" stroke-dasharray="none" stroke-width="3">')
    for q in ticks:
        o.append('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(q[0]-14), f(q[1]), f(q[0]+14), f(q[1])))
    o.append('</g></g>')
    o.append('</svg>')
    return "\n".join(o)

s = svg()
# swap viewer-side naming: theta>0 => screen right => side "right" (viewer convention)
P = [("GV24", "Thần Đình", "center", GV24, 0.03, "Đường giữa, vào trong chân tóc trán 0,5 thốn."),
     ("ST8", "Đầu Duy", "left", ST8_R, 0.03, "Góc trán, vào trong chân tóc 0,5 thốn (cách đường giữa 4,5 thốn)."),
     ("ST8", "Đầu Duy", "right", ST8_L, 0.03, "Góc trán, vào trong chân tóc 0,5 thốn (cách đường giữa 4,5 thốn)."),
     ("GV20", "Bách Hội", "center", GV20, 0.03, "Đường giữa, vào trong chân tóc trán 5 thốn; gần điểm giữa đường nối hai đỉnh vành tai."),
     ("EX-HN1", "Tứ Thần Thông", "front", GV20_front, 0.028, "1 thốn trước Bách Hội."),
     ("EX-HN1", "Tứ Thần Thông", "back", GV20_back, 0.028, "1 thốn sau Bách Hội."),
     ("EX-HN1", "Tứ Thần Thông", "left", GV20_R, 0.028, "1 thốn bên trái (màn hình) Bách Hội."),
     ("EX-HN1", "Tứ Thần Thông", "right", GV20_L, 0.028, "1 thốn bên phải (màn hình) Bách Hội.")]
data = {"view": "V03", "title": "Đỉnh đầu", "svg": "V03.svg", "frame": {"width": 1000, "height": 1400},
        "sideConvention": "viewer", "orientation": "Nhìn từ trên xuống, mặt khách ở phía DƯỚI màn hình, gáy ở phía TRÊN. Bên trái màn hình = bên PHẢI của khách.",
        "variants": {}, "midlineX": 0.5,
        "cun": {"unitsPerCun": None, "reference": "Thốn đo dọc da đầu (cung dọc đường giữa): chân tóc trán → chân tóc gáy = 12 thốn = %.1f cm trên mô hình. Trên hình chiếu từ trên, thốn bị co theo độ cong; vạch thốn trong nhóm guides đặt theo từng thốn từ chân tóc trán. Đầu Duy đặt ở góc trán (mốc giải phẫu) + 0,5 thốn vào chân tóc." % TOTAL,
                "ticksFromAnteriorHairline": [npt(q) for q in ticks]},
        "points": [], "muscles": [], "forbidden": [], "zones": []}
for pid, name, side, p, r, note in P:
    q = proj(p)
    data["points"].append({"id": pid, "name": name, "side": side, "x": nx(q[0]), "y": ny(q[1]), "r": r, "variant": None, "note": note})
open(OUT + '/V03.svg', 'w').write(s)
open(OUT + '/V03.json', 'w').write(json.dumps(data, ensure_ascii=False, indent=2))
print("overlaps", check_overlaps(data))
for p in data['points']: print(p['id'], p['side'], round(p['x']*1000), round(p['y']*1400))
print("ear apices", apexL, apexR, "ticks", [tuple(round(v) for v in q) for q in ticks])
clean = s.replace('<g id="guides"', '<g id="guides" style="display:none"')
open(SCR + '/V03-clean.svg', 'w').write(clean); render(SCR + '/V03-clean.svg', SCR + '/V03-clean.png')
debug_overlay(s, data, SCR + '/V03-debug.svg'); render(SCR + '/V03-debug.svg', SCR + '/V03-debug.png')

json.dump({"hair": [list(p) for p in hair_pts], "sil": [list(p) for p in sil], "gv20": proj(GV20), "hairline": [list(p) for p in hairline], "strands": [[list(q) for q in st] for st in strands], "front": list(proj(surf(0, sil_phi(0))))}, open(SCR + '/v03-geom.json', 'w'))
