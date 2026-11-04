from tools import *
SK='var(--skin, #f3d2bd)'; SH='var(--skin-shade, #efc7b0)'
ST35=(445,310); CUN=62; ANK=ST35[1]+16*CUN  # 1302
leg = ("M 330 -20 L 690 -20 C 692 60 690 120 682 150 C 672 190 660 210 660 240 "
       "C 660 290 652 320 656 360 C 664 430 684 480 682 560 C 680 650 660 720 640 820 "
       "C 620 920 592 1020 588 1120 C 586 1170 594 1195 606 1215 C 614 1240 604 1262 596 1280 "
       "C 600 1320 620 1370 636 1420 L 392 1420 C 396 1370 406 1330 408 1300 "
       "C 398 1288 392 1270 398 1250 C 406 1228 420 1200 422 1140 "
       "C 424 1040 410 960 388 880 C 362 790 340 700 338 600 C 336 520 342 460 346 410 "
       "C 348 390 338 378 344 360 C 350 340 352 320 350 290 C 348 240 352 200 344 160 C 334 110 330 60 330 -20 Z")
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">
  <title>V09 – Cẳng chân mặt trước (phải)</title>
  <g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>
  <g id="base" stroke="#9a6a52" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path id="v09-leg" d="{leg}" fill="{SK}"/>
  </g>
  <g id="skin-detail" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 682 560 C 680 650 660 720 640 820 C 620 920 592 1020 588 1120 C 600 1020 620 930 636 840 C 652 750 664 660 662 560 C 660 470 644 420 640 380 C 660 430 684 480 682 560 Z" fill="{SH}"/>
    <path d="M 338 600 C 340 700 362 790 388 880 C 380 790 362 700 358 600 C 356 520 358 470 362 420 C 348 470 336 520 338 600 Z" fill="{SH}"/>
    <path d="M 330 -20 L 352 -20 C 352 60 356 120 366 170 C 350 150 334 100 330 -20 Z" fill="{SH}"/>
    <path d="M 690 -20 L 668 -20 C 668 60 664 110 656 150 C 676 140 688 100 690 -20 Z" fill="{SH}"/>
    <ellipse cx="505" cy="205" rx="58" ry="66" fill="#fffaf3" opacity="0.35"/>
    <g fill="none" stroke="#c9967c" stroke-width="3">
      <path d="M 440 150 C 425 180 422 230 434 268"/>
      <path d="M 570 150 C 588 180 590 230 578 268"/>
      <path d="M 446 120 C 470 108 540 108 566 122" opacity="0.7"/>
      <path d="M 590 1258 C 560 1290 470 1292 420 1272" stroke-width="2.5" opacity="0.8"/>
      <path d="M 588 1236 C 600 1244 604 1260 596 1276" stroke-width="2.5"/>
    </g>
  </g>
  <g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
    <path id="lm-patella" d="M 505 142 C 560 142 572 180 566 222 C 558 260 532 290 505 292 C 478 290 452 260 444 222 C 438 180 450 142 505 142 Z"/>
    <path id="lm-patellar-ligament" d="M 478 286 C 482 340 488 390 490 418 M 532 286 C 528 340 522 390 520 418"/>
    <ellipse id="lm-tibial-tuberosity" cx="505" cy="428" rx="26" ry="16"/>
    <path id="lm-st35-hollow" d="M 432 296 C 422 310 428 330 446 334 C 462 330 468 310 462 296" stroke-dasharray="3 7"/>
    <path id="lm-medial-eye" d="M 548 296 C 542 310 548 330 566 332 C 582 328 588 310 578 296" stroke-dasharray="3 7" opacity="0.6"/>
    <path id="lm-tibial-crest" d="M 506 444 C 508 560 510 700 513 820 C 516 930 524 1020 540 1100 C 552 1150 572 1190 592 1214"/>
    <path id="lm-tibialis-anterior" d="M 488 446 C 450 480 432 560 430 660 C 430 760 448 860 476 940 C 488 990 500 1060 512 1120 C 520 1180 528 1240 532 1300" stroke-dasharray="2 8"/>
    <circle id="lm-fibula-head" cx="364" cy="378" r="18"/>
    <ellipse id="lm-medial-malleolus" cx="596" cy="1226" rx="20" ry="28"/>
    <ellipse id="lm-lateral-malleolus" cx="408" cy="1262" rx="18" ry="30"/>
    <path id="lm-knee-joint-line" d="M 360 308 L 420 310 M 590 310 L 650 308" opacity="0.7"/>
  </g>
  <g id="guides" fill="none" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.8">
    <line x1="250" y1="{ST35[1]}" x2="250" y2="{ANK}"/>
    {"".join(f'<line x1="{238 if i%4==0 else 242}" y1="{ST35[1]+i*CUN}" x2="{262 if i%4==0 else 258}" y2="{ST35[1]+i*CUN}" stroke-dasharray="none"/>' for i in range(17))}
    <line x1="262" y1="{ST35[1]}" x2="430" y2="{ST35[1]}"/>
    <line x1="262" y1="{ANK}" x2="560" y2="{ANK}"/>
    <line x1="262" y1="{ST35[1]+3*CUN}" x2="430" y2="{ST35[1]+3*CUN}" opacity="0.6"/>
    <path d="M 506 444 C 508 560 510 700 513 820" opacity="0.6"/>
  </g>
</svg>
'''
open(f"{OUT}/V09.svg","w").write(svg)
W,H=1000,1400
data={"view":"V09","title":"Cẳng chân mặt trước","svg":"V09.svg","frame":{"width":1000,"height":1400},
 "mirrorable":True,"limb":"leg","drawnSide":"right","variants":{},"midlineX":None,
 "orientation":"chân phải nhìn từ trước: mặt ngoài (xương mác) bên trái màn hình, mặt trong bên phải",
 "cun":{"unitsPerCun":round(CUN/W,4),"reference":f"Độc Tỵ ST35 (y={ST35[1]}) → nếp gấp cổ chân ST41 (y={ANK}) = 16 thốn; 1 thốn = {CUN} đv SVG"},
 "points":[
  {"id":"ST36","name":"Túc Tam Lý","side":"right","x":n(458,W),"y":n(ST35[1]+3*CUN,H),"r":0.03,"variant":None,
   "note":"dưới Độc Tỵ 3 thốn, cách mào xương chày 1 khoát ngón tay (ngón giữa) về phía ngoài"}],
 "landmarksData":[
  {"id":"ST35","name":"Độc Tỵ","x":n(ST35[0],W),"y":n(ST35[1],H),"note":"hõm ngoài dưới xương bánh chè, bờ ngoài gân bánh chè (mốc đo, không phải huyệt cần ấn)"},
  {"id":"ST41","name":"Giải Khê","x":n(505,W),"y":n(ANK,H),"note":"giữa nếp gấp cổ chân (mốc đo 16 thốn)"},
  {"id":"tibial-crest-at-ST36","name":"Mào xương chày ngang ST36","x":n(507,W),"y":n(ST35[1]+3*CUN,H)}],
 "muscles":[],"forbidden":[],"zones":[]}
data["sideConvention"]=CUSTOMER_SIDES  # "left"/"right" = bên của khách
open(f"{OUT}/V09.json","w").write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
