#!/usr/bin/env python3
"""preview.py NAME eyes mouth expr [layers...] -> NAME.svg/.png in scratch dir.
layers: debug (JSON overlay), nomuscles, noguides, nolandmarks, foam, mask, scrub"""
import json, sys, os, re, subprocess, itertools, math
SCR = os.path.dirname(os.path.abspath(__file__))
V = "/Users/dangkhoi/Documents/Project/spa_web_game/art/views"
name, eyes, mouth, expr, *layers = sys.argv[1:]
svg = open(f"{V}/V01.svg").read()
hide = {"state-eyes-open", "state-eyes-closed", "state-mouth-closed", "state-mouth-clench", "state-mouth-open",
        "expr-relaxed", "expr-neutral", "expr-pain"} - {f"state-{eyes}", f"state-{mouth}", expr}
for k in ("muscles", "guides", "landmarks"):
    if "no" + k in layers:
        hide.add(k)
for g in hide:
    svg = svg.replace(f'<g id="{g}"', f'<g id="{g}" display="none"', 1)
extra = []
v13 = open(f"{V}/V13.svg").read()
for g in ("foam", "mask", "scrub"):
    if g in layers:
        m = re.search(rf'  <g id="{g}">.*?\n  </g>', v13, re.S)
        extra.append(m.group(0))
if "debug" in layers:
    d = json.load(open(f"{V}/V01.json"))
    W, H = 1000, 1400
    for f in d["forbidden"]:
        if f["shape"] == "ellipse":
            extra.append(f'<ellipse cx="{f["x"]*W}" cy="{f["y"]*H}" rx="{f["rx"]*W}" ry="{f["ry"]*H}" fill="#e04f4f" fill-opacity="0.3" stroke="#e04f4f" stroke-width="1.5"/>')
        else:
            extra.append(f'<circle cx="{f["x"]*W}" cy="{f["y"]*H}" r="{f["r"]*W}" fill="#e04f4f" fill-opacity="0.3" stroke="#e04f4f" stroke-width="1.5"/>')
    if "polys" in layers:
        for m in d["muscles"]:
            pts = " ".join(f'{x*W:.1f},{y*H:.1f}' for x, y in m["polygon"])
            extra.append(f'<polygon points="{pts}" fill="none" stroke="#2050c0" stroke-width="1.5"/>')
            for s in m["strokes"]:
                (x1, y1), (x2, y2) = s["from"], s["to"]
                extra.append(f'<line x1="{x1*W}" y1="{y1*H}" x2="{x2*W}" y2="{y2*H}" stroke="#0a7a2a" stroke-width="3" marker-end="url(#ar)"/>')
    for p in d["points"]:
        extra.append(f'<circle cx="{p["x"]*W}" cy="{p["y"]*H}" r="{p["r"]*W}" fill="#2e9e6b" fill-opacity="0.35" stroke="#1d6b47" stroke-width="1.5"/>')
        extra.append(f'<circle cx="{p["x"]*W}" cy="{p["y"]*H}" r="2.5" fill="#000"/>')
        if p["side"] != "right":
            extra.append(f'<text x="{p["x"]*W+ (6 if p["side"]=="center" else -6)}" y="{p["y"]*H-6}" font-size="11" text-anchor="{"start" if p["side"]=="center" else "end"}" font-family="Helvetica" fill="#000">{p["id"]}</text>')
    # overlap check
    pts = d["points"]
    for a, b in itertools.combinations(pts, 2):
        dist = math.hypot((a["x"]-b["x"])*W, (a["y"]-b["y"])*H)
        if dist < (a["r"]+b["r"])*W:
            print("OVERLAP", a["id"], a["side"], b["id"], b["side"], round(dist,1), round((a["r"]+b["r"])*W,1))
    for p in pts:
        for f in d["forbidden"]:
            if f["shape"] == "ellipse":
                # approx: point circle vs ellipse expanded
                dx = (p["x"]-f["x"])*W/(f["rx"]*W + p["r"]*W); dy = (p["y"]-f["y"])*H/(f["ry"]*H + p["r"]*W)
                if dx*dx+dy*dy < 1: print("FORBIDDEN-OVERLAP", p["id"], p["side"], f["id"])
            else:
                if math.hypot((p["x"]-f["x"])*W, (p["y"]-f["y"])*H) < (p["r"]+f["r"])*W:
                    print("FORBIDDEN-OVERLAP", p["id"], p["side"], f["id"])
defs = '<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#0a7a2a"/></marker></defs>'
svg = svg.replace("</svg>", defs + "\n".join(extra) + "\n</svg>")
out = f"{SCR}/{name}.svg"
open(out, "w").write(svg)
subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless=new", "--disable-gpu",
                f"--screenshot={SCR}/{name}.png", "--window-size=1000,1400", "--hide-scrollbars", f"file://{out}"],
               capture_output=True)
print("rendered", name)
