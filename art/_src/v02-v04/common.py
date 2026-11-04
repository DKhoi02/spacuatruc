import json, math, os, subprocess
OUT = "/Users/dangkhoi/Documents/Project/spa_web_game/art/views"
SCR = os.environ.get("ART_PREVIEW_DIR", os.path.join(__import__("tempfile").gettempdir(), "art-preview", "v02-v04"))
os.makedirs(SCR, exist_ok=True)
SKIN = 'var(--skin, #f3d2bd)'
SHADE = 'var(--skin-shade, #efc7b0)'
HAIR = 'var(--hair, #3b2a24)'

def f(v):
    s = ("%.1f" % v).rstrip('0').rstrip('.')
    return s if s != '-0' else '0'

def smooth(pts, closed=False, t=1/6):
    """Catmull-Rom through pts -> cubic bezier path string."""
    p = list(pts)
    n = len(p)
    if n < 2: return ''
    d = "M%s %s" % (f(p[0][0]), f(p[0][1]))
    segs = n if closed else n - 1
    for i in range(segs):
        p0 = p[(i - 1) % n] if (closed or i > 0) else p[0]
        p1 = p[i]; p2 = p[(i + 1) % n]
        p3 = p[(i + 2) % n] if (closed or i + 2 < n) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t)
        c2 = (p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t)
        d += " C%s %s %s %s %s %s" % (f(c1[0]), f(c1[1]), f(c2[0]), f(c2[1]), f(p2[0]), f(p2[1]))
    if closed: d += " Z"
    return d

def poly(pts):
    return "M" + " L".join("%s %s" % (f(x), f(y)) for x, y in pts) + " Z"

def nx(x): return round(x / 1000, 4)
def ny(y): return round(y / 1400, 4)
def npt(p): return [nx(p[0]), ny(p[1])]

def render(svg_path, png_path):
    subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless=new", "--disable-gpu",
                    "--screenshot=" + png_path, "--window-size=1000,1400", "--hide-scrollbars", "file://" + svg_path],
                   capture_output=True)

def debug_overlay(svg_text, data, out_svg):
    """Append circles/polygons for JSON data, render."""
    g = ['<g id="debug" font-family="Helvetica, Arial, sans-serif" font-size="16">']
    for m in data.get('muscles', []):
        pts = " ".join("%s,%s" % (f(x*1000), f(y*1400)) for x, y in m['polygon'])
        g.append('<polygon points="%s" fill="none" stroke="#7a3fb0" stroke-width="2"/>' % pts)
        for s in m['strokes']:
            x1, y1 = s['from']; x2, y2 = s['to']
            g.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#7a3fb0" stroke-width="3" marker-end="url(#arr)"/>' % (f(x1*1000), f(y1*1400), f(x2*1000), f(y2*1400)))
    for z in data.get('forbidden', []):
        if z['shape'] == 'ellipse':
            g.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#e04f4f" fill-opacity="0.25" stroke="#e04f4f" stroke-width="2"/>' % (f(z['x']*1000), f(z['y']*1400), f(z['rx']*1000), f(z['ry']*1400)))
        elif z['shape'] == 'polygon':
            pts = " ".join("%s,%s" % (f(x*1000), f(y*1400)) for x, y in z['polygon'])
            g.append('<polygon points="%s" fill="#e04f4f" fill-opacity="0.25" stroke="#e04f4f" stroke-width="2"/>' % pts)
    for p in data['points']:
        cx, cy = p['x']*1000, p['y']*1400
        g.append('<circle cx="%s" cy="%s" r="%s" fill="#2e9e6b" fill-opacity="0.35" stroke="#1b6b47" stroke-width="2"/>' % (f(cx), f(cy), f(p['r']*1000)))
        g.append('<circle cx="%s" cy="%s" r="3" fill="#000"/>' % (f(cx), f(cy)))
        lab = p['id'] + ('-' + p['side'][0].upper() if p['side'] not in ('center',) else '') + (' [' + p['variant'] + ']' if p.get('variant') else '')
        g.append('<text x="%s" y="%s" fill="#0a3d8f" stroke="#fff" stroke-width="4" paint-order="stroke">%s</text>' % (f(cx+12), f(cy-10), lab))
    g.append('</g>')
    defs = '<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#7a3fb0"/></marker></defs>'
    txt = svg_text.replace('</svg>', defs + "\n".join(g) + '</svg>')
    open(out_svg, 'w').write(txt)

def check_overlaps(data):
    pts = data['points']; bad = []
    for i in range(len(pts)):
        for j in range(i+1, len(pts)):
            a, b = pts[i], pts[j]
            if a.get('variant') and b.get('variant') and a['variant'] != b['variant']:
                pass
            d = math.hypot((a['x']-b['x'])*1000, (a['y']-b['y'])*1400)
            if d < (a['r']+b['r'])*1000:
                bad.append((a['id'], a['side'], b['id'], b['side'], round(d,1)))
    return bad
