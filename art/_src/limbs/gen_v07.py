from tools import *
SK='var(--skin, #f3d2bd)'; SH='var(--skin-shade, #efc7b0)'
# fingers: (id, tx, ty, rot, w0, w1, L)
F = [("index",378,745,-3,100,84,455),("middle",492,728,0,104,88,497),
     ("ring",603,738,4,96,82,472),("little",702,768,8,84,70,360)]
# thumb parts (two tapered segments)
T1 = ("thumbm",372,1165,-30,132,116,250)   # metacarpal part, base at CMC
T2 = ("thumbp",250,965,-17,114,94,268)     # phalanges, base at MCP
defs = []
for fid,tx,ty,rot,w0,w1,L in F:
    defs.append(f'<path id="v07-{fid}" transform="translate({tx} {ty}) rotate({rot})" d="{taper(w0,w1,L)}"/>')
defs.append('<path id="v07-palm" d="M 330 742 C 330 712 340 708 370 708 L 700 712 C 735 714 748 740 748 770 C 752 860 735 1000 700 1150 C 692 1200 690 1240 694 1290 L 704 1420 L 342 1420 L 350 1290 C 352 1230 356 1190 352 1140 C 336 1020 326 880 330 742 Z"/>')
defs.append('<path id="v07-thumb" d="M 352 1240 C 300 1150 240 1060 212 1000 C 190 960 172 900 160 840 C 150 795 138 760 140 735 C 142 690 205 678 224 716 C 238 745 250 800 262 845 C 270 870 280 888 292 898 Q 322 850 336 748 L 420 900 L 420 1240 Z"/>')
ids = [d.split('"')[1] for d in defs]
order = ["v07-palm","v07-thumb","v07-index","v07-middle","v07-ring","v07-little"]

def nails():
    out=[]
    for fid,tx,ty,rot,w0,w1,L in F:
        b=w1/2
        nw=w1-26; nh=L*0.2
        out.append(f'<g transform="translate({tx} {ty}) rotate({rot})">'
          f'<path d="M {-nw/2:.1f} {-L+16+nh:.1f} L {-nw/2:.1f} {-L+20+b*0.5:.1f} C {-nw/2:.1f} {-L+8:.1f} {nw/2:.1f} {-L+8:.1f} {nw/2:.1f} {-L+20+b*0.5:.1f} L {nw/2:.1f} {-L+16+nh:.1f} C {nw/4:.1f} {-L+24+nh:.1f} {-nw/4:.1f} {-L+24+nh:.1f} {-nw/2:.1f} {-L+16+nh:.1f} Z" fill="#f7e2d6" stroke="#c9967c" stroke-width="2.5"/>'
          # DIP wrinkles
          f'<path d="M {-b*0.45:.1f} {-L*0.70:.1f} Q 0 {-L*0.70-8:.1f} {b*0.45:.1f} {-L*0.70:.1f} M {-b*0.3:.1f} {-L*0.70+9:.1f} Q 0 {-L*0.70+3:.1f} {b*0.3:.1f} {-L*0.70+9:.1f}" fill="none" stroke="#c9967c" stroke-width="2.5"/>'
          # PIP wrinkles
          f'<path d="M {-b*0.6:.1f} {-L*0.40:.1f} Q 0 {-L*0.40-12:.1f} {b*0.6:.1f} {-L*0.40:.1f} M {-b*0.5:.1f} {-L*0.40+11:.1f} Q 0 {-L*0.40+1:.1f} {b*0.5:.1f} {-L*0.40+11:.1f} M {-b*0.35:.1f} {-L*0.40+22:.1f} Q 0 {-L*0.40+15:.1f} {b*0.35:.1f} {-L*0.40+22:.1f}" fill="none" stroke="#c9967c" stroke-width="2.5"/>'
          # knuckle highlight (MCP)
          f'<path d="M {-b*0.55:.1f} 10 Q 0 -6 {b*0.55:.1f} 10" fill="none" stroke="#c9967c" stroke-width="2.5" opacity="0.8"/>'
          '</g>')
    # thumb nail (seen obliquely) + IP wrinkle
    tx,ty,rot,L,w1 = 240,965,-15,272,94
    out.append(f'<g transform="translate({tx} {ty}) rotate({rot})">'
      f'<path d="M -40 {-L+66} L -40 {-L+38} C -40 {-L+10} 4 {-L+8} 6 {-L+38} L 6 {-L+66} C -8 {-L+74} -26 {-L+74} -40 {-L+66} Z" fill="#f7e2d6" stroke="#c9967c" stroke-width="2.5"/>'
      f'<path d="M -34 {-L*0.52} Q -6 {-L*0.52-12} 22 {-L*0.52} M -28 {-L*0.52+11} Q -6 {-L*0.52+2} 16 {-L*0.52+11}" fill="none" stroke="#c9967c" stroke-width="2.5"/>'
      '</g>')
    return "".join(out)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">
  <title>V07 – Mu bàn tay (phải)</title>
  <defs>
    {chr(10).join("    "+d for d in defs).strip()}
  </defs>
  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>
  <g id="base" stroke-linejoin="round" stroke-linecap="round">
    <g fill="none" stroke="#9a6a52" stroke-width="8">{"".join(f'<use href="#{i}"/>' for i in order)}</g>
    <g fill="{SK}">{"".join(f'<use href="#{i}"/>' for i in order)}</g>
  </g>
  <g id="skin-detail" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 700 1150 C 735 1000 752 860 748 770 C 735 900 712 1030 680 1150 C 672 1220 675 1300 684 1420 L 704 1420 L 694 1290 C 690 1240 692 1200 700 1150 Z" fill="{SH}"/>
    <path d="M 212 1000 C 240 1060 300 1150 352 1240 L 362 1200 C 320 1130 270 1060 240 1000 Z" fill="{SH}" opacity="0.8"/>
    <path d="M 690 1252 C 700 1236 716 1238 720 1256" fill="none" stroke="#c9967c" stroke-width="3"/>
    <path d="M 432 1262 C 470 1272 560 1272 610 1258" fill="none" stroke="#c9967c" stroke-width="2.5" opacity="0.7"/>
    <path d="M 436 742 L 441 712 M 548 744 L 549 712 M 655 752 L 650 722" fill="none" stroke="#9a6a52" stroke-width="3"/>
    {nails()}
  </g>
  <g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" opacity="0.75">
    <path id="lm-metacarpal-1" d="M 340 1170 C 310 1110 272 1040 240 975" stroke-dasharray="2 9"/>
    <path id="lm-metacarpal-2" d="M 402 1150 C 396 1020 388 880 380 762" stroke-dasharray="2 9"/>
    <path d="M 456 1150 C 465 1020 480 880 490 748" stroke-dasharray="2 9" opacity="0.6"/>
    <path id="lm-thumb-web" d="M 336 770 Q 320 850 280 905"/>
    <ellipse id="lm-mc2-head" cx="380" cy="742" rx="22" ry="14" opacity="0.7"/>
    <ellipse id="lm-mc1-head" cx="232" cy="962" rx="24" ry="16" transform="rotate(-30 232 962)" opacity="0.7"/>
  </g>
  <g id="guides" fill="none" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.8">
    <line x1="403" y1="1180" x2="377" y2="700"/>
    <line x1="370" y1="955" x2="414" y2="955" stroke-dasharray="none"/><line x1="380" y1="1150" x2="424" y2="1150" stroke-dasharray="none"/><line x1="358" y1="760" x2="402" y2="760" stroke-dasharray="none"/>
  </g>
</svg>
'''
open(f"{OUT}/V07.svg","w").write(svg)
W,H=1000,1400
data = {
 "view":"V07","title":"Mu bàn tay","svg":"V07.svg","frame":{"width":1000,"height":1400},
 "mirrorable":True,"limb":"hand","drawnSide":"right",
 "variants":{},"midlineX":None,
 "cun":{"unitsPerCun":0.1,"reference":"bề ngang khớp liên đốt ngón cái ≈ 1 thốn (≈100 đv SVG). Hợp Cốc định vị theo xương bàn tay 2, không cần thước thốn"},
 "points":[
  {"id":"LI4","name":"Hợp Cốc","side":"right","x":n(350,W),"y":n(955,H),"r":0.034,"variant":None,
   "note":"mu bàn tay, giữa xương bàn tay 2 (gốc y≈1150, đầu y≈760 → giữa y≈955), sát bờ phía ngón cái"}],
 "muscles":[],"forbidden":[],"zones":[]
}
data["sideConvention"]=CUSTOMER_SIDES  # "left"/"right" = bên của khách
open(f"{OUT}/V07.json","w").write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
