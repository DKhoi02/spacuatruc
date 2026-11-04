from tools import *
import math
SK='var(--skin, #f3d2bd)'; SH='var(--skin-shade, #efc7b0)'
T=[("t1",618,330,3,146,132,255),("t2",506,348,-2,96,84,205),("t3",420,372,-6,90,78,185),
   ("t4",345,408,-11,84,72,162),("t5",280,462,-18,76,66,128)]
TD={t[0]:t for t in T}
def tg(tid,lx,ly):
    _,tx,ty,r,_,_,_=TD[tid]; a=math.radians(r)
    return (tx+lx*math.cos(a)-ly*math.sin(a), ty+lx*math.sin(a)+ly*math.cos(a))
def ellipse(cx,cy,rx,ry,rot=0,k=16):
    a=math.radians(rot); pts=[]
    for i in range(k):
        t=2*math.pi*i/k; x=rx*math.cos(t); y=ry*math.sin(t)
        pts.append((cx+x*math.cos(a)-y*math.sin(a), cy+x*math.sin(a)+y*math.cos(a)))
    return pts
def toe_part(tid, y0f, y1f, shrink=0.80, k=6):
    """polygon covering toe tid between local y=-L*y0f (distal) and -L*y1f (proximal)"""
    _,tx,ty,r,w0,w1,L=TD[tid]
    pts=[]
    ys=[-L*y0f+(-L*y1f+L*y0f)*i/k for i in range(k+1)]
    def hw(ly):  # approx half width at local y
        f=min(max((-ly)/L,0),1); return ((w0*(1-f)+w1*f)/2)*shrink
    right=[tg(tid,hw(ly),ly) for ly in ys]; left=[tg(tid,-hw(ly),ly) for ly in reversed(ys)]
    return right+left
def toe_pad(tid):
    _,tx,ty,r,w0,w1,L=TD[tid]
    cx,cy=tg(tid,0,-L+w1*0.62)
    return ellipse(cx,cy,w1*0.36,w1*0.52,r,14)
def rrect(x0,y0,x1,y1,rad=30,k=4):
    pts=[]
    for cx,cy,s in [(x1-rad,y0+rad,-90),(x1-rad,y1-rad,0),(x0+rad,y1-rad,90),(x0+rad,y0+rad,180)]:
        for i in range(k+1):
            t=math.radians(s+90*i/k); pts.append((cx+rad*math.cos(t),cy+rad*math.sin(t)))
    return pts

Z=[]  # id, name(foot region), bodyArea, onlyFoot, [polys]
Z.append(("head-brain","Búp ngón cái","Đầu, não",None,[ellipse(620,172,54,76,3,18)]))
Z.append(("sinuses","Mặt dưới các ngón chân còn lại","Xoang",None,[toe_pad(t) for t in ["t2","t3","t4","t5"]]))
Z.append(("eyes","Chân các ngón 2–3","Mắt",None,[toe_part("t2",0.52,0.02),toe_part("t3",0.50,0.02)]))
Z.append(("ears","Chân các ngón 4–5","Tai",None,[toe_part("t4",0.48,0.02),toe_part("t5",0.42,0.02)]))
Z.append(("neck-thyroid","Chân ngón cái (cổ ngón cái)","Cổ, tuyến giáp",None,[rrect(560,248,644,352,26)]))
Z.append(("chest-lungs","Ụ bàn chân (dưới chân các ngón)","Ngực, phổi",None,[[(302,470),(340,425),(400,398),(470,388),(560,384),(640,388),(684,402),(686,470),(680,560),(600,582),(480,592),(380,588),(302,580)]]))
Z.append(("stomach-pancreas","Giữa vòm bàn chân, phía trên","Dạ dày, tụy","left",[rrect(462,604,612,728,34)]))
Z.append(("liver-gallbladder","Giữa vòm bàn chân, phía ngoài","Gan, túi mật","right",[rrect(298,610,446,800,36)]))
Z.append(("spleen","Giữa vòm bàn chân, phía ngoài","Lách","left",[rrect(306,620,440,780,36)]))
Z.append(("intestines","Giữa vòm bàn chân, phía dưới","Ruột",None,[rrect(322,872,584,1046,46)]))
Z.append(("kidneys","Giữa vòm, gần mép trong","Thận",None,[ellipse(522,800,50,58,0,16)]))
Z.append(("pelvis-sciatic","Gót chân","Vùng chậu, thần kinh tọa",None,[[(300,1100),(360,1076),(446,1068),(530,1076),(560,1100),(566,1200),(548,1290),(500,1338),(440,1350),(370,1336),(318,1290),(296,1200)]]))
Z.append(("spine","Mép trong bàn chân (cung trong, từ ngón cái đến gót)","Cột sống",None,[[(688,240),(696,310),(722,390),(732,470),(728,520),(704,612),(664,700),(634,780),(616,880),(612,980),(614,1100),(612,1220),(600,1290),(568,1282),(576,1210),(578,1100),(576,980),(580,870),(598,770),(628,688),(666,604),(690,520),(692,440),(674,370),(654,300),(648,248)]]))
Z.append(("shoulder","Mép ngoài bàn chân, phía trên","Vai",None,[[(242,488),(270,470),(298,478),(298,600),(276,612),(248,606),(238,560)]]))
Z.append(("knee-hip","Mép ngoài bàn chân, phía dưới","Đầu gối, hông",None,[[(260,880),(312,880),(316,1070),(276,1080),(268,980)]]))

defs=[f'<path id="v12-{i}" transform="translate({x} {y}) rotate({r})" d="{taper(a,b,L,base=50)}"/>' for i,x,y,r,a,b,L in T]
SOLE="M 245 520 C 262 420 370 340 460 342 C 540 344 640 300 690 304 C 706 330 732 390 735 460 C 737 490 734 508 728 520 C 718 600 668 680 640 760 C 618 830 612 900 612 980 C 612 1060 618 1140 612 1220 C 604 1310 530 1368 440 1368 C 350 1368 290 1310 280 1220 C 272 1140 270 1040 266 940 C 262 840 252 760 246 680 C 240 620 236 560 245 520 Z"
defs.append(f'<path id="v12-sole" d="{SOLE}"/>')
order=["v12-sole"]+[f"v12-{t[0]}" for t in T]
def toedetail():
    o=[]
    for i,x,y,r,a,b,L in T:
        o.append(f'<g transform="translate({x} {y}) rotate({r})">'
          f'<ellipse cx="0" cy="{-L+b*0.62:.1f}" rx="{b*0.36:.1f}" ry="{b*0.5:.1f}" fill="#e9a99b" fill-opacity="0.22"/>'
          f'<path d="M {-b*0.38:.1f} {-L+b*1.25:.1f} Q 0 {-L+b*1.25+7:.1f} {b*0.38:.1f} {-L+b*1.25:.1f}" fill="none" stroke="#c9967c" stroke-width="2.5"/>'
          f'<path d="M {-a*0.36:.1f} 22 Q 0 30 {a*0.36:.1f} 22" fill="none" stroke="#c9967c" stroke-width="2.5"/>'
          '</g>')
    return "".join(o)
WEB=(460,345); HEEL=(440,1368)
k1=(WEB[0]+(HEEL[0]-WEB[0])/3, WEB[1]+(HEEL[1]-WEB[1])/3)
k2=(WEB[0]+(HEEL[0]-WEB[0])*2/3, WEB[1]+(HEEL[1]-WEB[1])*2/3)
def zpath(polys): return " ".join("M "+" L ".join(f"{x:.0f} {y:.0f}" for x,y in p)+" Z" for p in polys)
def ofattr(of): return ' data-only-foot="%s"' % of if of else ""
zones_svg="".join(f'<path id="z-{zid}"{ofattr(of)} d="{zpath(ps)}"/>' for zid,_,_,of,ps in Z)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">
  <title>V12 – Lòng bàn chân (phải)</title>
  <defs>
    {chr(10).join("    "+d for d in defs).strip()}
  </defs>
  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>
  <g id="base" stroke-linejoin="round" stroke-linecap="round">
    <g fill="none" stroke="#9a6a52" stroke-width="8">{"".join(f'<use href="#{i}"/>' for i in order)}</g>
    <g fill="{SK}">{"".join(f'<use href="#{i}"/>' for i in order)}</g>
  </g>
  <g id="skin-detail" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 728 520 C 718 600 668 680 640 760 C 618 830 612 900 612 980 C 612 1060 618 1100 612 1130 C 590 1060 584 960 596 880 C 610 790 650 700 690 600 C 704 570 718 540 728 520 Z" fill="{SH}"/>
    <path d="M 252 400 C 300 360 400 372 470 368 C 560 364 650 360 700 380 C 722 420 722 500 700 560 C 640 590 520 600 440 600 C 360 600 290 590 250 560 C 240 510 240 450 252 400 Z" fill="#e9a99b" fill-opacity="0.16"/>
    <ellipse cx="444" cy="1228" rx="146" ry="122" fill="#e9a99b" fill-opacity="0.16"/>
    <path d="M 252 640 C 262 760 272 900 284 1060 L 310 1060 C 300 900 290 760 280 640 Z" fill="#e9a99b" fill-opacity="0.1"/>
    <g fill="none" stroke="#c9967c" stroke-width="3">
      <path d="M 290 580 C 360 606 480 612 560 600 C 620 592 670 576 700 556" opacity="0.7"/>
      <path d="M 320 1110 C 380 1090 500 1090 570 1112" opacity="0.6"/>
    </g>
    {toedetail()}
  </g>
  <g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.75">
    <ellipse id="lm-mt1-head" cx="652" cy="440" rx="44" ry="34" stroke-dasharray="2 8"/>
    <ellipse id="lm-mt5-head" cx="270" cy="540" rx="28" ry="26" stroke-dasharray="2 8"/>
    <path id="lm-ki1-depression" d="M 420 676 C 436 694 470 694 486 676" />
    <path id="lm-heel-pad" d="M 300 1110 C 340 1086 540 1086 588 1110" stroke-dasharray="2 8"/>
  </g>
  <g id="guides" fill="none" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.8">
    <line x1="{WEB[0]}" y1="{WEB[1]}" x2="{HEEL[0]}" y2="{HEEL[1]}"/>
    <line x1="{k1[0]-22:.1f}" y1="{k1[1]:.1f}" x2="{k1[0]+22:.1f}" y2="{k1[1]:.1f}" stroke-dasharray="none"/>
    <line x1="{k2[0]-22:.1f}" y1="{k2[1]:.1f}" x2="{k2[0]+22:.1f}" y2="{k2[1]:.1f}" stroke-dasharray="none"/>
    <line x1="{WEB[0]-22}" y1="{WEB[1]}" x2="{WEB[0]+22}" y2="{WEB[1]}" stroke-dasharray="none"/>
    <line x1="{HEEL[0]-22}" y1="{HEEL[1]}" x2="{HEEL[0]+22}" y2="{HEEL[1]}" stroke-dasharray="none"/>
  </g>
  <g id="zones" fill="#8fb39a" fill-opacity="0.10" stroke="#4f7a62" stroke-width="2" stroke-dasharray="6 6" stroke-opacity="0.55" stroke-linejoin="round">
    {zones_svg}
  </g>
</svg>
'''
open(f"{OUT}/V12.svg","w").write(svg)
W,H=1000,1400
def npoly(p): return [[round(x/W,4),round(y/H,4)] for x,y in p]
zones=[]
for zid,nm,body,of,ps in Z:
    big=max(ps,key=lambda p: (max(q[0] for q in p)-min(q[0] for q in p))*(max(q[1] for q in p)-min(q[1] for q in p)))
    zones.append({"id":zid,"name":nm,"bodyArea":body,"side":"right","onlyFoot":of,"svgPath":f"z-{zid}",
                  "polygon":npoly(big),"polygons":[npoly(p) for p in ps]})
data={"view":"V12","title":"Lòng bàn chân","svg":"V12.svg","frame":{"width":1000,"height":1400},
 "mirrorable":True,"limb":"foot","drawnSide":"right","variants":{},"midlineX":None,
 "orientation":"lòng bàn chân phải, ngón hướng lên, gót ở dưới; ngón cái (mép trong) bên phải màn hình",
 "cun":{"unitsPerCun":0.109,"reference":f"Dũng Tuyền đo theo tỉ lệ: đường nối khe ngón 2–3 ({WEB[0]},{WEB[1]}) → bờ sau gót ({HEEL[0]},{HEEL[1]}), điểm 1/3 trước. 1 thốn ≈ 2,1 cm ≈ 109 đv (52 đv/cm), chỉ ước lượng"},
 "points":[{"id":"KI1","name":"Dũng Tuyền","side":"right","x":n(k1[0],W),"y":n(k1[1],H),"r":0.032,"variant":None,
   "note":"chỗ lõm sâu nhất khi co ngón; chỗ nối 1/3 trước và 2/3 sau đường từ khe ngón 2–3 đến gót"}],
 "landmarksData":[{"id":"web-2-3","name":"Khe ngón 2–3","x":n(WEB[0],W),"y":n(WEB[1],H)},
                  {"id":"heel-back","name":"Bờ sau gót","x":n(HEEL[0],W),"y":n(HEEL[1],H)}],
 "zonesNote":"Phản xạ học bàn chân (không thuộc chuẩn WHO). Hình vẽ chân PHẢI; onlyFoot='left' chỉ hiện khi code lật hình thành chân trái, onlyFoot='right' chỉ hiện ở chân phải, null = cả hai. 'polygon' là phần lớn nhất, 'polygons' là tất cả các phần (vùng xoang/mắt/tai gồm nhiều ngón).",
 "muscles":[],"forbidden":[],"zones":zones}
data["sideConvention"]=CUSTOMER_SIDES  # "left"/"right" = bên của khách
open(f"{OUT}/V12.json","w").write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
