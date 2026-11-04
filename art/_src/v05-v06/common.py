import re, json

W, H = 1000, 1400
SKIN = 'var(--skin, #f3d2bd)'
SHADE = 'var(--skin-shade, #efc7b0)'
HAIR = 'var(--hair, #3b2a24)'
OUT_BODY = '#9a6a52'


def mirror(d):
    """Mirror a path written with 'x,y' pairs across x=500."""
    return re.sub(r'(-?[\d.]+),(-?[\d.]+)',
                  lambda m: f"{1000 - float(m.group(1)):g},{m.group(2)}", d)


def nx(x):
    return round(x / W, 4)


def ny(y):
    return round(y / H, 4)


def npt(p):
    return [nx(p[0]), ny(p[1])]


def poly_attr(pts):
    return ' '.join(f'{x:g},{y:g}' for x, y in pts)


def mirror_pts(pts):
    return [(1000 - x, y) for x, y in pts]


def dump_json(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')


def debug_overlay(svg_text, data, out_path, extra=''):
    """Insert circles/polygons of JSON data into a copy of the SVG."""
    g = ['<g id="debug" font-family="Helvetica, Arial, sans-serif">']
    for f in data.get('forbidden', []):
        if f['shape'] == 'polygon':
            pts = ' '.join(f"{x*W:.1f},{y*H:.1f}" for x, y in f['points'])
            g.append(f'<polygon points="{pts}" fill="#ff0000" fill-opacity="0.25" stroke="#ff0000" stroke-width="2"/>')
        else:
            g.append(f'<ellipse cx="{f["x"]*W}" cy="{f["y"]*H}" rx="{f["rx"]*W}" ry="{f["ry"]*H}" fill="#ff0000" fill-opacity="0.25" stroke="#f00"/>')
    for m in data.get('muscles', []):
        pts = ' '.join(f"{x*W:.1f},{y*H:.1f}" for x, y in m['polygon'])
        g.append(f'<polygon points="{pts}" fill="none" stroke="#7a2bd9" stroke-width="2"/>')
        for s in m['strokes']:
            x1, y1 = s['from'][0]*W, s['from'][1]*H
            x2, y2 = s['to'][0]*W, s['to'][1]*H
            g.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#7a2bd9" stroke-width="4"/>'
                     f'<circle cx="{x2}" cy="{y2}" r="7" fill="#7a2bd9"/>')
    for v in data.get('vertebrae', []):
        g.append(f'<text x="{v["x"]*W+14}" y="{v["y"]*H+5}" font-size="13" fill="#0a6">{v["id"]}</text>')
    for p in data.get('points', []):
        cx, cy, r = p['x']*W, p['y']*H, p['r']*W
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#00aa55" fill-opacity="0.35" stroke="#006633" stroke-width="1.5"/>'
                 f'<circle cx="{cx}" cy="{cy}" r="3" fill="#003"/>')
        if p['side'] != 'right':
            g.append(f'<text x="{cx - r - 4}" y="{cy+5}" text-anchor="end" font-size="14" fill="#003">{p["id"]}</text>')
    g.append(extra)
    g.append('</g>')
    out = svg_text.replace('</svg>', '\n'.join(g) + '\n</svg>')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out)
