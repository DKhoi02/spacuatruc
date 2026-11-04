import json, subprocess, sys, os, re
OUT = "/Users/dangkhoi/Documents/Project/spa_web_game/art/views"
SCR = os.path.dirname(os.path.abspath(__file__))
CUSTOMER_SIDES = 'customer: "left"/"right" = bên trái/phải CỦA KHÁCH (giải phẫu), không phải bên màn hình'
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def taper(w0, w1, L, base=40):
    """finger/toe path in local coords: base at y=+base, tip at y=-L (rounded)."""
    a, b = w0/2, w1/2
    return (f"M {-a:.1f} {base} C {-a:.1f} {base-L*0.3:.1f} {-b-2:.1f} {-L*0.6:.1f} {-b:.1f} {-L+b:.1f} "
            f"A {b:.1f} {b*1.05:.1f} 0 0 1 {b:.1f} {-L+b:.1f} "
            f"C {b+2:.1f} {-L*0.6:.1f} {a:.1f} {base-L*0.3:.1f} {a:.1f} {base} Z")

def render(svg_path, png_path):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", f"--screenshot={png_path}",
                    "--window-size=1000,1400", "--hide-scrollbars", "file://" + svg_path],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def overlay(view):
    svg = open(f"{OUT}/{view}.svg").read()
    data = json.load(open(f"{OUT}/{view}.json"))
    W, H = 1000, 1400
    els = []
    for p in data.get("points", []):
        x, y, r = p["x"]*W, p["y"]*H, p["r"]*W
        els.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#2e9e6b" fill-opacity="0.3" stroke="#2e9e6b" stroke-width="2"/>'
                   f'<circle cx="{x}" cy="{y}" r="4" fill="#0a5"/>'
                   f'<text x="{x+r+4}" y="{y+6}" font-size="20" fill="#123" font-family="Helvetica">{p["id"]}</text>')
    for p in data.get("landmarksData", []):
        x, y = p["x"]*W, p["y"]*H
        els.append(f'<circle cx="{x}" cy="{y}" r="6" fill="none" stroke="#a0f" stroke-width="3"/>'
                   f'<text x="{x+10}" y="{y-8}" font-size="18" fill="#a0f">{p["id"]}</text>')
    for z in data.get("zones", []):
        for poly in z["polygons"]:
            pts = " ".join(f"{a*W:.1f},{b*H:.1f}" for a, b in poly)
            els.append(f'<polygon points="{pts}" fill="#f80" fill-opacity="0.15" stroke="#f60" stroke-width="2"/>')
        a, b = z["polygon"][0]
        cx = sum(q[0] for q in z["polygon"])/len(z["polygon"])*W; cy = sum(q[1] for q in z["polygon"])/len(z["polygon"])*H
        els.append(f'<text x="{cx-30}" y="{cy}" font-size="15" fill="#630">{z["id"]}{"*"+z["onlyFoot"][0] if z.get("onlyFoot") else ""}</text>')
    for f in data.get("forbidden", []):
        els.append(f'<ellipse cx="{f["x"]*W}" cy="{f["y"]*H}" rx="{f["rx"]*W}" ry="{f["ry"]*H}" fill="red" fill-opacity="0.2"/>')
    # grid
    grid = "".join(f'<line x1="{i}" y1="0" x2="{i}" y2="1400" stroke="#000" stroke-opacity="0.07"/>' for i in range(0,1001,100))
    grid += "".join(f'<line x1="0" y1="{i}" x2="1000" y2="{i}" stroke="#000" stroke-opacity="0.07"/>' for i in range(0,1401,100))
    svg = svg.replace("</svg>", grid + "".join(els) + "</svg>")
    p = f"{SCR}/{view}-debug.svg"
    open(p, "w").write(svg)
    render(p, f"{SCR}/{view}-debug.png")
    render(f"{OUT}/{view}.svg", f"{SCR}/{view}.png")

def n(v, d): return round(v/d, 4)

if __name__ == "__main__":
    for v in sys.argv[1:]:
        json.load(open(f"{OUT}/{v}.json"))
        overlay(v)
        print("ok", v)
