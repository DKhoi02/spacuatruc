from tools import *
SK='var(--skin, #f3d2bd)'; SH='var(--skin-shade, #efc7b0)'
T=[("t1",355,345,-3,128,112,215),("t2",463,350,3,80,68,200),("t3",540,378,7,74,64,190),
   ("t4",606,410,12,68,58,172),("t5",664,452,18,62,54,140)]
defs=[f'<path id="v11-{i}" transform="translate({x} {y}) rotate({r})" d="{taper(a,b,L,base=50)}"/>' for i,x,y,r,a,b,L in T]
defs.append('<path id="v11-foot" d="M 292 362 C 300 300 420 282 500 300 C 580 318 660 360 704 424 C 718 450 720 480 716 540 C 712 620 696 700 688 780 C 686 830 690 870 684 900 C 690 920 686 944 668 956 C 652 1000 650 1200 656 1420 L 362 1420 C 366 1200 364 1000 352 940 C 334 920 322 896 326 870 C 330 850 330 830 326 800 C 314 700 296 560 288 440 C 286 410 286 380 292 362 Z"/>')
order=["v11-foot"]+[f"v11-{t[0]}" for t in T]
def nails():
    o=[]
    for i,x,y,r,a,b,L in T:
        nw=b-(30 if i=="t1" else 18); nh=(78 if i=="t1" else 44)
        top=-L+12
        o.append(f'<g transform="translate({x} {y}) rotate({r})">'
          f'<path d="M {-nw/2:.1f} {top+nh:.1f} L {-nw/2:.1f} {top+nw*0.4:.1f} Q {-nw/2:.1f} {top:.1f} 0 {top:.1f} Q {nw/2:.1f} {top:.1f} {nw/2:.1f} {top+nw*0.4:.1f} L {nw/2:.1f} {top+nh:.1f} Q 0 {top+nh+10:.1f} {-nw/2:.1f} {top+nh:.1f} Z" fill="#f7e2d6" stroke="#c9967c" stroke-width="2.5"/>'
          f'<path d="M {-b*0.28:.1f} {-L*0.38:.1f} Q 0 {-L*0.38-7:.1f} {b*0.28:.1f} {-L*0.38:.1f}" fill="none" stroke="#c9967c" stroke-width="2.5"/>'
          '</g>')
    return "".join(o)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">
  <title>V11 – Mu bàn chân (phải)</title>
  <defs>
    {chr(10).join("    "+d for d in defs).strip()}
  </defs>
  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>
  <g id="base" stroke-linejoin="round" stroke-linecap="round">
    <g fill="none" stroke="#9a6a52" stroke-width="8">{"".join(f'<use href="#{i}"/>' for i in order)}</g>
    <g fill="{SK}">{"".join(f'<use href="#{i}"/>' for i in order)}</g>
  </g>
  <g id="skin-detail" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 716 540 C 712 620 696 700 688 780 C 686 830 690 870 684 900 C 670 860 668 800 672 760 C 680 680 694 600 700 520 Z" fill="{SH}"/>
    <path d="M 668 956 C 652 1000 650 1200 656 1420 L 636 1420 C 632 1200 634 1020 648 960 Z" fill="{SH}"/>
    <path d="M 288 440 C 296 560 314 700 326 800 C 334 700 320 560 312 450 Z" fill="{SH}" opacity="0.7"/>
    <g fill="none" stroke="#c9967c" stroke-width="3">
      <path d="M 352 900 C 420 930 580 940 660 930" opacity="0.8"/>
      <path d="M 370 926 C 440 952 570 958 640 952" stroke-width="2.5" opacity="0.6"/>
    </g>
    {nails()}
  </g>
  <g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
    <path id="lm-metatarsal-1" d="M 362 352 C 372 450 386 560 398 640 M 342 356 C 350 450 362 560 374 640" stroke-dasharray="2 8"/>
    <path id="lm-metatarsal-2" d="M 452 350 C 452 450 448 560 440 650 M 470 350 C 472 450 468 560 460 660" stroke-dasharray="2 8"/>
    <path d="M 535 380 C 530 480 520 580 505 690 M 602 416 C 590 520 576 620 560 710 M 662 462 C 650 560 630 650 612 730" stroke-dasharray="2 10" opacity="0.5"/>
    <ellipse cx="352" cy="352" rx="34" ry="20" opacity="0.6"/>
    <ellipse cx="461" cy="350" rx="22" ry="15" opacity="0.6"/>
    <path id="lm-metatarsal-bases-junction" d="M 386 622 C 404 650 426 660 448 650" />
    <g id="lm-dorsalis-pedis" opacity="0.8"><circle cx="440" cy="735" r="9"/><path d="M 422 718 A 24 24 0 0 0 422 752 M 458 718 A 24 24 0 0 1 458 752" stroke-width="2.5"/></g>
    <ellipse id="lm-medial-malleolus" cx="340" cy="868" rx="22" ry="30"/>
    <ellipse id="lm-lateral-malleolus" cx="668" cy="916" rx="20" ry="32"/>
  </g>
  <g id="guides" fill="none" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.8">
    <line x1="398" y1="650" x2="352" y2="320"/>
    <line x1="448" y1="665" x2="461" y2="320"/>
    <line x1="380" y1="640" x2="470" y2="640" stroke-dasharray="none" opacity="0.7"/>
  </g>
</svg>
'''
open(f"{OUT}/V11.svg","w").write(svg)
W,H=1000,1400
data={"view":"V11","title":"Mu bàn chân","svg":"V11.svg","frame":{"width":1000,"height":1400},
 "mirrorable":True,"limb":"foot","drawnSide":"right","variants":{},"midlineX":None,
 "orientation":"mu bàn chân phải, ngón chân hướng lên; ngón cái bên trái màn hình",
 "cun":{"unitsPerCun":0.097,"reference":"ước lượng tỉ lệ: 1 thốn ≈ 2,1 cm ≈ 97 đv SVG (46 đv/cm). Thái Xung định vị theo mốc xương, không đo thốn"},
 "points":[
  {"id":"LR3","name":"Thái Xung","side":"right","x":n(419,W),"y":n(598,H),"r":0.028,"variant":None,
   "note":"giữa xương bàn chân 1 và 2, chỗ lõm ngay phía trước (phía ngón chân) chỗ hai nền xương gặp nhau (chỗ gặp nhau y≈645), trên đường đi của động mạch mu chân"}],
 "landmarksData":[
  {"id":"mt12-base-junction","name":"Chỗ gặp nhau của nền xương bàn chân 1–2","x":n(424,W),"y":n(645,H)},
  {"id":"dorsalis-pedis","name":"Mạch mu chân","x":n(440,W),"y":n(735,H)}],
 "muscles":[],"forbidden":[],"zones":[]}
data["sideConvention"]=CUSTOMER_SIDES  # "left"/"right" = bên của khách
open(f"{OUT}/V11.json","w").write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
