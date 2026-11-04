import sys, json, random, math
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
g3 = json.load(open(SCR + '/v03-geom.json')); g4 = json.load(open(SCR + '/v04-geom.json'))

def inside(pt, poly):
    x, y = pt; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i+1) % n]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1)*(x2 - x1)/(y2 - y1): c = not c
    return c

def bubbles(rng, centers, poly, extra_ok=None, n_per=20):
    out = []
    for cx, cy, spread in centers:
        for _ in range(n_per):
            a = rng.uniform(0, 2*math.pi); d = spread*math.sqrt(rng.random())
            x, y = cx + d*math.cos(a), cy + d*math.sin(a)*0.8
            if not (inside((x, y), poly) or (extra_ok and extra_ok(x, y))): continue
            r = rng.uniform(9, 26) * (1 - 0.4*d/spread)
            out.append((x, y, r))
    out.sort(key=lambda b: b[2])
    s = []
    # soft foam bed under bubbles
    for cx, cy, spread in centers:
        blobs = []
        for k in range(7):
            a = 2*math.pi*k/7 + rng.uniform(-0.3, 0.3)
            x, y = cx + spread*0.42*math.cos(a), cy + spread*0.3*math.sin(a)
            if inside((x, y), poly) or (extra_ok and extra_ok(x, y)): blobs.append((x, y))
        bed = "".join('<circle cx="%s" cy="%s" r="%s"/>' % (f(x), f(y), f(spread*rng.uniform(0.32, 0.42))) for x, y in blobs)
        bed += '<circle cx="%s" cy="%s" r="%s"/>' % (f(cx), f(cy), f(spread*0.45))
        s.append('<g fill="#fbfdfd" stroke="#d3e4e8" stroke-width="2" opacity="0.95">%s</g>' % bed)
        s.append('<g fill="#fbfdfd" opacity="1">%s</g>' % bed.replace('/>', ' transform="translate(0 0)"/>', 0))
    for x, y, r in out:
        s.append('<circle cx="%s" cy="%s" r="%s" fill="#ffffff" fill-opacity="0.92" stroke="#c9dde2" stroke-width="2"/>' % (f(x), f(y), f(r)))
        if r > 12:
            s.append('<path d="M%s %s a %s %s 0 0 1 %s %s" fill="none" stroke="#cfe3e6" stroke-width="2.5" stroke-linecap="round"/>' % (
                f(x - r*0.5), f(y - r*0.15), f(r*0.55), f(r*0.55), f(r*0.35), f(-r*0.42)))
    return s

def droplets(rng, pts):
    s = []
    for x, y in pts:
        s.append('<path d="M%s %s c -7 10 -8 16 0 18 c 8 -2 7 -8 0 -18 Z" fill="#cfe3e6" stroke="#9fc2c8" stroke-width="1.5"/>' % (f(x), f(y)))
        s.append('<circle cx="%s" cy="%s" r="2.2" fill="#ffffff"/>' % (f(x - 2), f(y + 11)))
    return s

rng = random.Random(7)
hair3 = g3['hair']; hair4 = g4['hair']; bx, by, brx, bry = g4['bun']
o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">',
     '<defs>',
     '<clipPath id="v14-clip-top"><path d="%s"/></clipPath>' % smooth(hair3, True, t=0.12),
     '<clipPath id="v14-clip-back"><path d="%s"/><ellipse cx="%s" cy="%s" rx="%s" ry="%s"/></clipPath>' % (smooth(hair4, True, t=0.14), bx, by, brx, bry),
     '</defs>']
# ---- wet hair ----
o.append('<g id="wet-hair">')
o.append('<g id="wet-top"><g clip-path="url(#v14-clip-top)" stroke-linecap="round" fill="none">')
o.append('<rect width="1000" height="1400" fill="#140d0b" opacity="0.32"/>')
for st in g3['strands']:
    if len(st) > 3:
        o.append('<path d="%s" stroke="#120c0a" stroke-width="9" opacity="0.45"/>' % smooth(st))
        mid = st[len(st)//3: len(st)//3 + 3]
        if len(mid) >= 2: o.append('<path d="%s" stroke="#ffffff" stroke-width="3" opacity="0.28"/>' % smooth(mid))
o.append('</g>')
o.append('<g class="drops">' + "".join(droplets(rng, [(p[0], p[1] + 6) for p in g3['hairline'][4::7]])) + '</g></g>')
o.append('<g id="wet-back"><g clip-path="url(#v14-clip-back)" stroke-linecap="round" fill="none">')
o.append('<rect width="1000" height="1400" fill="#140d0b" opacity="0.32"/>')
for x0, y0 in [(520,834),(580,826),(645,810),(700,786),(740,735),(785,600)]:
    for sg in (1, -1):
        xa = 500 + sg*(x0-500)
        d = 'M%s %s C %s %s %s %s %s %s' % (f(xa), f(y0 - 8), f(500 + sg*(x0-500)*1.02), f(y0 - 200), f(500 + sg*(x0-500)*0.55), f(380), f(500 + sg*35), f(290))
        o.append('<path d="%s" stroke="#120c0a" stroke-width="9" opacity="0.45"/>' % d)
for sg in (1, -1):
    o.append('<path d="M%s 640 C %s 560 %s 470 %s 400" stroke="#ffffff" stroke-width="3" opacity="0.28"/>' % (f(500+sg*120), f(500+sg*118), f(500+sg*100), f(500+sg*80)))
o.append('</g>')
o.append('<g class="drops">' + "".join(droplets(rng, [(430, 846), (560, 842), (660, 828), (350, 830), (500, 852)])) + '</g></g>')
o.append('</g>')
# ---- foam ----
o.append('<g id="foam">')
gv20 = g3['gv20']
top_centers = [(500, 300, 120), (360, 470, 95), (640, 470, 95), (300, 640, 80), (700, 640, 80), (500, 620, 90), (430, 780, 70), (590, 790, 70), (500, 190, 80)]
o.append('<g id="foam-top">' + "".join(bubbles(rng, top_centers, hair3)) + '</g>')
back_centers = [(500, 420, 120), (360, 560, 90), (640, 560, 90), (500, 700, 100), (300, 690, 60), (700, 690, 60), (500, 230, 80), (420, 800, 55), (590, 805, 55)]
o.append('<g id="foam-back">' + "".join(bubbles(rng, back_centers, hair4, extra_ok=lambda x, y: ((x-bx)/brx)**2 + ((y-by)/bry)**2 < 1)) +
         '<path d="M486 846 c -3 20 -3 40 2 58 c 6 -16 8 -40 4 -58 Z" fill="#ffffff" opacity="0.85" stroke="#c9dde2" stroke-width="2"/></g>')
o.append('</g>')
o.append('</svg>')
s = "\n".join(o)
open(OUT + '/V14.svg', 'w').write(s)

# previews: overlay on V03 / V04
def compose(base_svg, keep, out):
    b = open(OUT + '/' + base_svg).read()
    body = s.split('\n', 1)[1].rsplit('</svg>', 1)[0]
    for gid in ['wet-top', 'wet-back', 'foam-top', 'foam-back']:
        if gid not in keep:
            body = body.replace('<g id="%s"' % gid, '<g id="%s" style="display:none"' % gid)
    b = b.replace('<g id="guides"', '<g id="guides" style="display:none"').replace('<g id="landmarks"', '<g id="landmarks" style="display:none"')
    open(SCR + '/' + out + '.svg', 'w').write(b.replace('</svg>', body + '</svg>'))
    render(SCR + '/' + out + '.svg', SCR + '/' + out + '.png')
compose('V03.svg', ['wet-top', 'wet-top-drops', 'foam-top'], 'V14-on-V03')
compose('V04.svg', ['wet-back', 'wet-back-drops', 'foam-back'], 'V14-on-V04')
compose('V03.svg', ['wet-top', 'wet-top-drops'], 'V14-wet-on-V03')
