from tools import *
SK='var(--skin, #f3d2bd)'; SH='var(--skin-shade, #efc7b0)'
MM=(632,1130); CUN=72; KNEE=MM[1]-13*CUN  # 194
leg=("M 478 -20 C 474 40 466 90 468 130 C 470 165 480 185 484 205 C 488 230 486 260 490 300 "
     "C 494 320 496 340 494 360 C 500 450 512 560 522 660 C 534 780 548 900 558 1020 "
     "C 562 1080 568 1120 570 1146 C 552 1170 500 1178 450 1188 C 380 1200 320 1222 260 1246 "
     "C 220 1260 180 1268 150 1276 C 112 1286 100 1324 116 1340 C 130 1350 180 1348 220 1346 "
     "C 260 1346 290 1346 320 1338 C 380 1316 440 1302 500 1304 C 560 1308 620 1336 680 1346 "
     "C 720 1352 760 1346 778 1326 C 796 1300 792 1262 776 1226 C 762 1190 762 1160 758 1120 "
     "C 752 1060 744 1000 746 950 C 750 880 790 790 820 700 C 842 630 852 540 846 470 "
     "C 840 390 826 330 808 280 C 798 250 796 220 800 190 C 804 140 812 80 818 -20 Z")
nail='<path d="M 114 1300 C 122 1286 150 1274 178 1272 C 184 1284 178 1294 166 1298 C 148 1302 128 1306 114 1300 Z" fill="#f7e2d6" stroke="#c9967c" stroke-width="2.5"/>'
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">
  <title>V10 – Cẳng chân mặt trong (phải)</title>
  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>
  <g id="base" stroke="#9a6a52" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path id="v10-leg" d="{leg}" fill="{SK}"/>
  </g>
  <g id="skin-detail" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 846 470 C 852 540 842 630 820 700 C 790 790 750 880 746 950 C 744 1000 752 1060 758 1120 C 740 1050 726 980 730 920 C 740 840 790 760 806 680 C 824 600 828 520 818 440 C 830 450 842 460 846 470 Z" fill="{SH}"/>
    <path d="M 320 1338 C 380 1316 440 1302 500 1304 C 560 1308 620 1336 680 1346 C 620 1316 560 1286 500 1280 C 430 1276 370 1300 320 1338 Z" fill="{SH}"/>
    <path d="M 808 280 C 798 250 796 220 800 190 C 804 140 812 80 818 -20 L 790 -20 C 786 80 780 150 784 220 C 788 250 798 270 808 280 Z" fill="{SH}"/>
    {nail}
    <g fill="none" stroke="#c9967c" stroke-width="3">
      <path d="M 256 1248 C 246 1280 248 1318 258 1342" stroke-width="2.5"/>
      <path d="M 188 1270 C 184 1300 186 1326 192 1346" stroke-width="2" opacity="0.7"/>
      <path d="M 570 1148 C 588 1140 598 1130 602 1116" stroke-width="2.5" opacity="0.8"/>
      <path d="M 790 230 C 770 236 756 240 742 240 M 796 206 C 782 210 770 212 760 212" stroke-width="2.5" opacity="0.8"/>
      <path d="M 488 120 C 500 100 520 96 540 104" stroke-width="2.5" opacity="0.7"/>
    </g>
  </g>
  <g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
    <ellipse id="lm-medial-malleolus" cx="{MM[0]}" cy="{MM[1]}" rx="30" ry="36"/>
    <path id="lm-tibia-medial-border" d="M 640 270 C 628 480 626 720 636 920 C 642 1010 650 1060 662 1100"/>
    <path id="lm-tibia-anterior-crest" d="M 506 360 C 518 500 534 700 552 900 C 560 980 566 1050 576 1100" opacity="0.6" stroke-dasharray="2 8"/>
    <path id="lm-achilles-tendon" d="M 700 900 C 702 990 712 1080 722 1150 C 728 1190 736 1220 750 1246 M 744 880 C 742 960 748 1060 758 1130"/>
    <path id="lm-medial-condyle" d="M 560 170 C 600 160 660 170 690 200" opacity="0.6"/>
    <path id="lm-knee-joint-line" d="M 500 {KNEE} L 790 {KNEE}" stroke-dasharray="3 9" opacity="0.6"/>
    <ellipse id="lm-navicular-tuberosity" cx="540" cy="1214" rx="16" ry="12" opacity="0.7"/>
    <ellipse id="lm-1st-metatarsal-head" cx="266" cy="1306" rx="26" ry="24" opacity="0.6"/>
  </g>
  <g id="guides" fill="none" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.8">
    <line x1="400" y1="{KNEE}" x2="400" y2="{MM[1]}"/>
    {"".join(f'<line x1="{388 if i%3==0 else 392}" y1="{MM[1]-i*CUN}" x2="{412 if i%3==0 else 408}" y2="{MM[1]-i*CUN}" stroke-dasharray="none"/>' for i in range(14))}
    <line x1="412" y1="{MM[1]}" x2="600" y2="{MM[1]}"/>
    <line x1="412" y1="{KNEE}" x2="480" y2="{KNEE}"/>
    <line x1="412" y1="{MM[1]-3*CUN}" x2="620" y2="{MM[1]-3*CUN}" opacity="0.6"/>
  </g>
</svg>
'''
open(f"{OUT}/V10.svg","w").write(svg)
W,H=1000,1400
data={"view":"V10","title":"Cẳng chân mặt trong","svg":"V10.svg","frame":{"width":1000,"height":1400},
 "mirrorable":True,"limb":"leg","drawnSide":"right","variants":{},"midlineX":None,
 "orientation":"chân phải nhìn từ mặt trong: phía trước (ống quyển, ngón chân) bên trái màn hình, gót và bắp chân bên phải",
 "cun":{"unitsPerCun":round(CUN/W,4),"reference":f"đỉnh mắt cá trong (y={MM[1]}) → khe khớp gối (y={KNEE}) = 13 thốn; 1 thốn = {CUN} đv SVG"},
 "points":[
  {"id":"SP6","name":"Tam Âm Giao","side":"right","x":n(662,W),"y":n(MM[1]-3*CUN,H),"r":0.028,"variant":None,
   "note":"trên đỉnh mắt cá trong 3 thốn, sát bờ sau (bờ trong) xương chày"},
  {"id":"KI3","name":"Thái Khê","side":"right","x":n(688,W),"y":n(MM[1],H),"r":0.024,"variant":None,
   "note":"chỗ lõm giữa đỉnh mắt cá trong và gân gót, ngang đỉnh mắt cá"}],
 "landmarksData":[
  {"id":"medial-malleolus","name":"Đỉnh mắt cá trong","x":n(MM[0],W),"y":n(MM[1],H)},
  {"id":"knee-joint-line","name":"Khe khớp gối","x":n(640,W),"y":n(KNEE,H)}],
 "muscles":[],"forbidden":[],"zones":[]}
data["sideConvention"]=CUSTOMER_SIDES  # "left"/"right" = bên của khách
open(f"{OUT}/V10.json","w").write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
