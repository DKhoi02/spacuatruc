from tools import *
SK='var(--skin, #f3d2bd)'; SH='var(--skin-shade, #efc7b0)'
WR=934; CUN=96
F = [("little",318,522,-7,74,64,286),("ring",399,460,-2,82,72,350),
     ("middle",486,444,0,88,76,384),("index",576,466,4,88,74,330)]
defs=[]
for fid,tx,ty,rot,w0,w1,L in F:
    defs.append(f'<path id="v08-{fid}" transform="translate({tx} {ty}) rotate({rot})" d="{taper(w0,w1,L,base=60)}"/>')
defs.append('<path id="v08-palm" d="M 282 545 C 282 505 300 492 330 492 L 600 470 C 614 472 620 490 620 512 L 650 700 L 622 960 C 640 1100 652 1300 655 1420 L 300 1420 C 308 1300 322 1150 334 1010 C 336 965 322 920 300 880 C 266 815 262 650 282 545 Z"/>')
defs.append('<path id="v08-thumb" d="M 618 962 C 700 890 752 800 764 712 C 776 650 806 600 810 548 C 814 482 728 466 714 520 C 704 560 690 600 668 640 Q 646 600 620 512 L 560 600 L 560 960 Z"/>')
order=["v08-palm","v08-thumb"]+[f"v08-{f[0]}" for f in F]
def fdetail():
    out=[]
    for fid,tx,ty,rot,w0,w1,L in F:
        b=w1/2; a=w0/2
        out.append(f'<g transform="translate({tx} {ty}) rotate({rot})" fill="none" stroke="#c9967c" stroke-width="2.5" stroke-linecap="round">'
          f'<path d="M {-a*0.8:.1f} 6 Q 0 12 {a*0.8:.1f} 6 M {-a*0.6:.1f} 16 Q 0 21 {a*0.6:.1f} 16"/>'
          f'<path d="M {-b*0.85:.1f} {-L*0.42:.1f} Q 0 {-L*0.42+6:.1f} {b*0.85:.1f} {-L*0.42:.1f} M {-b*0.6:.1f} {-L*0.42+10:.1f} Q 0 {-L*0.42+15:.1f} {b*0.6:.1f} {-L*0.42+10:.1f}"/>'
          f'<path d="M {-b*0.75:.1f} {-L*0.70:.1f} Q 0 {-L*0.70+6:.1f} {b*0.75:.1f} {-L*0.70:.1f}"/>'
          f'<ellipse cx="0" cy="{-L+b*1.25:.1f}" rx="{b*0.55:.1f}" ry="{b*0.75:.1f}" fill="#e9a99b" fill-opacity="0.18" stroke="none"/>'
          '</g>')
    return "".join(out)
ticks="".join(f'<line x1="232" y1="{WR+i*CUN}" x2="262" y2="{WR+i*CUN}" stroke-dasharray="none"/>' for i in range(0,5))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">
  <title>V08 – Lòng bàn tay và cổ tay (phải)</title>
  <defs>
    {chr(10).join("    "+d for d in defs).strip()}
  </defs>
  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>
  <g id="base" stroke-linejoin="round" stroke-linecap="round">
    <g fill="none" stroke="#9a6a52" stroke-width="8">{"".join(f'<use href="#{i}"/>' for i in order)}</g>
    <g fill="{SK}">{"".join(f'<use href="#{i}"/>' for i in order)}</g>
  </g>
  <g id="skin-detail" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 624 512 C 572 600 540 740 548 900 C 580 930 610 950 622 960 C 650 900 690 830 700 760 C 690 690 660 600 624 512 Z" fill="{SH}" opacity="0.55"/>
    <path d="M 282 600 C 270 700 272 800 300 880 C 318 900 330 905 345 905 C 320 820 310 700 300 610 Z" fill="{SH}" opacity="0.45"/>
    <path d="M 714 520 C 704 560 690 600 668 640 C 700 610 718 570 726 530 Z" fill="{SH}"/>
    <ellipse cx="770" cy="540" rx="24" ry="32" transform="rotate(20 770 540)" fill="#e9a99b" fill-opacity="0.18"/>
    <g fill="none" stroke="#c9967c" stroke-width="3">
      <path id="crease-distal-transverse" d="M 284 592 C 350 578 440 566 535 512"/>
      <path id="crease-proximal-transverse" d="M 624 545 C 590 585 520 612 420 650 C 390 662 365 676 350 690"/>
      <path id="crease-thenar" d="M 622 540 C 570 610 538 750 552 905"/>
      <path d="M 726 712 C 704 722 684 722 668 716" stroke-width="2.5"/>
      <path d="M 774 610 C 760 622 740 624 724 618 M 770 624 C 758 632 744 634 732 630" stroke-width="2.5"/>
      <path id="crease-wrist" d="M 342 {WR-2} Q 480 {WR+12} 618 {WR-4}"/>
      <path d="M 380 {WR-24} Q 480 {WR-14} 590 {WR-26}" stroke-width="2.5" opacity="0.8"/>
      <path d="M 350 {WR+34} Q 480 {WR+44} 610 {WR+32}" stroke-width="2" opacity="0.6"/>
    </g>
    {fdetail()}
  </g>
  <g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" opacity="0.75">
    <path id="lm-metacarpal-2" d="M 572 880 C 576 760 579 640 578 530" stroke-dasharray="2 9"/>
    <path id="lm-metacarpal-3" d="M 500 890 C 496 760 492 640 489 525" stroke-dasharray="2 9"/>
    <path id="lm-palmaris-longus" d="M 486 {WR+6} C 486 1100 484 1250 482 1400 M 500 {WR+6} C 500 1100 498 1250 496 1400" opacity="0.8"/>
    <path id="lm-flexor-carpi-radialis" d="M 548 {WR+2} C 542 1100 532 1250 524 1400 M 564 {WR} C 558 1100 548 1250 540 1400" opacity="0.8"/>
    <path id="lm-flexor-carpi-ulnaris" d="M 366 {WR-20} C 364 1100 356 1250 350 1400 M 382 {WR-12} C 380 1100 372 1250 366 1400" opacity="0.8"/>
    <circle id="lm-pisiform" cx="372" cy="{WR-30}" r="15" opacity="0.8"/>
  </g>
  <g id="guides" fill="none" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.8">
    <line x1="232" y1="{WR}" x2="660" y2="{WR}"/>
    <line x1="247" y1="{WR}" x2="247" y2="{WR+4*CUN}"/>
    {ticks}
    <line x1="262" y1="{WR+2*CUN}" x2="600" y2="{WR+2*CUN}" opacity="0.6"/>
  </g>
</svg>
'''
open(f"{OUT}/V08.svg","w").write(svg)
W,H=1000,1400
data={"view":"V08","title":"Lòng bàn tay và cổ tay mặt trong","svg":"V08.svg","frame":{"width":1000,"height":1400},
 "mirrorable":True,"limb":"hand","drawnSide":"right","variants":{},"midlineX":None,
 "cun":{"unitsPerCun":round(CUN/W,4),"reference":f"nếp gấp cổ tay → nếp gấp khuỷu = 12 thốn; 1 thốn = {CUN} đv SVG (dọc). Nếp gấp cổ tay y={WR} ({round(WR/H,4)}); vạch thốn mỗi {CUN} đv xuống cẳng tay"},
 "points":[
  {"id":"PC8","name":"Lao Cung","side":"right","x":n(532,W),"y":n(605,H),"r":0.03,"variant":None,"note":"giữa xương bàn tay 2 và 3, ngay trên khớp bàn-ngón, trên nếp gấp ngang lòng bàn tay"},
  {"id":"PC6","name":"Nội Quan","side":"right","x":n(520,W),"y":n(WR+2*CUN,H),"r":0.03,"variant":None,"note":"trên nếp gấp cổ tay 2 thốn, giữa gân gan tay dài và gân gấp cổ tay quay"},
  {"id":"HT7","name":"Thần Môn","side":"right","x":n(397,W),"y":n(WR+2,H),"r":0.026,"variant":None,"note":"trên nếp gấp cổ tay, bờ phía ngón cái (bờ quay) của gân gấp cổ tay trụ"}],
 "landmarksData":[{"id":"wrist-crease","name":"Nếp gấp cổ tay","x":0.48,"y":n(WR,H)}],
 "muscles":[],"forbidden":[],"zones":[]}
data["sideConvention"]=CUSTOMER_SIDES  # "left"/"right" = bên của khách
open(f"{OUT}/V08.json","w").write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
