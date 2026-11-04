import sys, math, json
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

# ---------- geometry (profile facing viewer's LEFT) ----------
FRONT = [(305,330),(286,400),(273,470),(266,540),(262,590),(272,628),(258,675),(236,725),(210,760),(206,775),(220,789),(244,797),(262,803)]
UPPER_LIP = [(262,803),(259,822),(254,842),(260,856),(271,862)]
LOWER_C = [(271,864),(262,876),(265,892),(288,912),(279,940),(284,966),(318,986),(370,983),(430,973),(490,955),(545,932),(582,902)]
ANGLE = (582,902)
PIV = (578,705)

def jaw_tf(p, ang=-10, dx=-25, dy=5):
    w = max(0.0, min(1.0, (ANGLE[0] - p[0]) / 120.0))
    a = math.radians(ang)
    vx, vy = p[0]-PIV[0], p[1]-PIV[1]
    rx = PIV[0] + vx*math.cos(a) - vy*math.sin(a) + dx
    ry = PIV[1] + vx*math.sin(a) + vy*math.cos(a) + dy
    return (p[0] + (rx-p[0])*w, p[1] + (ry-p[1])*w)

LOWER_O = [jaw_tf(p) for p in LOWER_C]
PATCH_IN = [(582,902),(582,896),(545,912),(500,930),(450,936),(390,895),(320,873),(276,863)]

HEAD_FILL = FRONT + UPPER_LIP[1:] + [(320,882),(390,910),(450,950),(500,942),(548,922),(590,905),(640,845),(700,835),(760,852),(800,862),(822,815),(857,740),(886,640),(896,520),(866,410),(790,310),(680,245),(560,226),(450,232),(360,265)]
NECK = [(790,790),(805,960),(815,1080),(850,1170),(960,1240),(1010,1280),(1010,1410),(330,1410),(355,1300),(400,1230),(450,1160),(440,1080),(428,1010),(420,960),(500,880),(650,800)]
BACK_NECK = [(802,862),(805,960),(815,1080),(850,1170),(960,1240),(1010,1282)]
FRONT_NECK_C = [(424,985),(436,1060),(450,1160)]
FRONT_NECK_LOW = [(450,1160),(400,1230),(355,1300),(336,1410)]

EAR = [(612,642),(620,604),(646,587),(682,590),(709,612),(721,650),(719,700),(706,745),(689,781),(668,804),(646,808),(628,796),(620,773),(614,750),(606,739),(597,719),(598,700),(606,690),(612,672)]
HAIR_OUT = [(284,402),(289,338),(338,256),(450,210),(570,200),(700,214),(820,284),(896,400),(918,520),(906,650),(872,762),(832,842),(812,864)]
HAIRLINE = [(790,850),(756,808),(746,760),(741,700),(730,642),(706,600),(664,580),(622,584),(598,612),(588,655),(580,692),(548,690),(515,630),(470,540),(424,466),(396,442),(352,420),(300,406)]

# ---------- points ----------
canthus = (368,655); brow_tail = (415,605)
mid = ((canthus[0]+brow_tail[0])/2, (canthus[1]+brow_tail[1])/2)
CUN = 60.0
P = {
 'EX-HN5': (mid[0]+CUN, mid[1]),
 'GB1': (canthus[0]+0.5*CUN, canthus[1]),
 'ST7': (540,722), 'SI19': (590,716), 'TE17': (702,798),
 'ST6': (540,862), 'ST5': (482,942), 'SI18': (370,742), 'ST8': (411,414),
}

def lips_closed(pressed=False):
    up = [(258,836),(254,846),(262,857),(272,862),(305,866),(289,851),(270,840)]
    lo = [(272,864),(305,866),(292,878),(272,888),(263,881),(264,871)] if not pressed else [(272,864),(305,866),(292,874),(272,881),(264,876),(265,869)]
    s = '<path d="%s" fill="#d98a83" stroke="#a55a54" stroke-width="3" stroke-linejoin="round"/>' % smooth(up, True)
    s += '<path d="%s" fill="#e39a92" stroke="#a55a54" stroke-width="3" stroke-linejoin="round"/>' % smooth(lo, True)
    return s

def lower_face(chain, extra_in=''):
    fill = smooth(UPPER_LIP + chain[1:], False)
    patch_pts = chain + PATCH_IN[1:]
    s = '<path d="%s" fill="%s"/>' % (smooth(patch_pts, True, t=0.12), SKIN)
    # exterior outline (lip/chin/jaw)
    s += '<path d="%s" fill="none" stroke="#9a6a52" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' % smooth(UPPER_LIP + chain)
    return s

def svg():
    o = []
    o.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">')
    o.append('<g id="bg"><rect width="1000" height="1400" fill="#fbf6f0"/></g>')
    # base
    o.append('<g id="base" stroke-linecap="round" stroke-linejoin="round">')
    o.append('<path d="%s" fill="%s" stroke="#9a6a52" stroke-width="4"/>' % (smooth(NECK, True, t=0.12), SHADE))
    o.append('<path d="%s" fill="%s"/>' % (smooth(HEAD_FILL, True, t=0.14), SKIN))
    o.append('<path d="%s" fill="none" stroke="#9a6a52" stroke-width="4"/>' % smooth(FRONT))
    # shoulder roundness
    o.append('<path d="M560 1300 C 640 1270 760 1280 840 1330" fill="none" stroke="#9a6a52" stroke-width="3" opacity="0.6"/>')
    o.append('</g>')
    # skin-detail
    o.append('<g id="skin-detail" fill="none" stroke-linecap="round">')
    o.append('<ellipse cx="372" cy="782" rx="50" ry="24" fill="#e9a99b" opacity="0.35"/>')
    o.append('<path d="M612 905 C 640 900 680 880 720 850" stroke="#c9967c" stroke-width="3" opacity="0.6"/>')
    # SCM soft line on neck
    o.append('<path d="M735 845 C 680 960 560 1100 470 1200" stroke="#d9a890" stroke-width="3" opacity="0.7"/>')
    o.append('<path d="M287 790 C 296 812 304 832 312 850" stroke="#c9967c" stroke-width="2"/>')
    o.append('</g>')
    # hair
    o.append('<g id="hair" stroke-linecap="round" stroke-linejoin="round">')
    o.append('<g transform="rotate(-24 742 214)"><ellipse cx="742" cy="214" rx="104" ry="78" fill="%s"/>' % HAIR)
    o.append('<path d="M660 200 C 700 160 790 160 830 210 M672 238 C 720 200 790 205 818 245" fill="none" stroke="#2f2420" stroke-width="3"/></g>')
    o.append('<path d="%s" fill="%s"/>' % (smooth(HAIR_OUT + HAIRLINE, True, t=0.14), HAIR))
    o.append('<path d="M684 300 C 700 284 724 282 736 296" fill="none" stroke="#8fb39a" stroke-width="12"/>')
    for d in ["M318 412 C 400 330 520 270 660 262", "M420 462 C 500 360 600 300 690 282", "M520 640 C 560 480 640 360 712 300",
              "M610 590 C 640 480 690 380 730 312", "M760 790 C 820 650 830 470 760 318", "M860 640 C 880 520 860 410 790 330"]:
        o.append('<path d="%s" fill="none" stroke="#2f2420" stroke-width="3" opacity="0.8"/>' % d)
    o.append('</g>')
    # features
    o.append('<g id="features" fill="none" stroke-linecap="round" stroke-linejoin="round">')
    # ear
    o.append('<path d="%s" fill="%s" stroke="#9a6a52" stroke-width="4"/>' % (smooth(EAR, True), SKIN))
    o.append('<path d="M624 702 C 616 676 630 650 652 652 C 672 655 680 690 668 724 C 660 744 640 750 626 738 Z" fill="#e3b49d" stroke="none"/>')
    o.append('<path d="M627 622 C 650 600 690 606 704 640 C 712 676 704 720 688 752 C 678 772 666 786 652 792" stroke="#9a6a52" stroke-width="3"/>')
    o.append('<path d="M640 645 C 660 632 684 648 686 682 C 688 712 674 740 650 756" stroke="#c9967c" stroke-width="3"/>')
    o.append('<path d="M612 672 C 622 662 634 660 640 668" stroke="#9a6a52" stroke-width="3"/>')
    o.append('<ellipse cx="620" cy="716" rx="7" ry="9" fill="#b9806a" stroke="none"/>')
    # eye (open)
    o.append('<path d="M305 646 C 318 636 345 638 368 654 C 348 664 322 666 308 660 C 302 655 302 650 305 646 Z" fill="#ffffff" stroke="#5a3d30" stroke-width="3"/>')
    o.append('<ellipse cx="314" cy="651" rx="7" ry="11" fill="#6b4a3a"/><ellipse cx="311" cy="651" rx="3" ry="6" fill="#1e1410"/>')
    o.append('<path d="M305 646 C 318 636 345 638 368 654" stroke="#5a3d30" stroke-width="5"/>')
    o.append('<path d="M306 644 L 296 636 M313 640 L 305 630 M322 638 L 317 628" stroke="#5a3d30" stroke-width="2.5"/>')
    o.append('<path d="M306 630 C 325 622 350 628 366 640" stroke="#c9967c" stroke-width="2.5"/>')
    # brow
    o.append('<path d="M280 598 C 310 586 360 584 415 605" stroke="#4a342c" stroke-width="12"/>')
    # nose ala + nostril
    o.append('<path d="M262 760 C 240 758 232 786 256 796" stroke="#c9967c" stroke-width="3"/>')
    o.append('<ellipse cx="246" cy="790" rx="9" ry="4" fill="#b77a68"/>')
    o.append('</g>')
    # landmarks
    o.append('<g id="landmarks" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round" opacity="0.75">')
    o.append('<path id="lm-zygomatic-arch" d="M400 690 C 450 684 520 684 588 690 M396 712 C 450 706 530 704 586 706"/>')
    o.append('<path id="lm-zygoma-body" d="M332 746 C 360 752 395 742 430 714"/>')
    o.append('<path id="lm-orbital-rim" d="M384 608 C 394 632 394 668 382 694"/>')
    o.append('<path id="lm-mandibular-notch" d="M500 730 C 512 764 548 766 562 728" stroke-dasharray="6 6"/>')
    o.append('<path id="lm-condyle" d="M560 728 C 558 712 570 704 584 708"/>')
    o.append('<path id="lm-mandible-ramus-angle" d="M586 728 C 588 790 590 860 582 902 C 570 920 548 932 520 942"/>')
    o.append('<path id="lm-mastoid" d="M716 770 C 720 800 728 830 742 836 C 756 830 760 800 752 770"/>')
    o.append('<path id="lm-tragus" d="M600 702 C 596 712 598 724 606 736"/>')
    o.append('</g>')
    # muscles
    o.append('<g id="muscles" stroke="#a55a54" stroke-width="2" stroke-linejoin="round">')
    o.append('<path id="m-temporalis" d="%s" fill="#d98a83" fill-opacity="0.35"/>' % smooth(TEMPORALIS, True, t=0.12))
    o.append('<path d="M450 470 C 470 560 500 640 512 690 M520 432 C 530 540 535 630 534 692 M600 430 C 590 540 570 630 552 694 M670 470 C 640 560 600 640 568 698" fill="none" stroke-opacity="0.6"/>')
    o.append('<path id="m-masseter" d="%s" fill="#d98a83" fill-opacity="0.35"/>' % smooth(MASSETER, True, t=0.12))
    o.append('<path d="M440 728 C 455 800 470 880 488 940 M495 716 C 510 800 525 870 540 925 M545 712 C 555 790 565 860 572 912" fill="none" stroke-opacity="0.6"/>')
    o.append('</g>')
    # guides
    o.append('<g id="guides" stroke="#4f86c6" stroke-width="2.5" stroke-dasharray="10 8" fill="none" opacity="0.8">')
    o.append('<line x1="300" y1="643" x2="640" y2="707"/>')   # canthus -> tragus line
    o.append('<line x1="368" y1="600" x2="368" y2="800"/>')   # vertical below outer canthus
    o.append('<line x1="590" y1="560" x2="590" y2="860"/>')   # vertical in front of tragus
    o.append('</g>')
    # states
    o.append('<g id="state-mouth-closed">' + lower_face(LOWER_C) + lips_closed() +
             '<ellipse cx="540" cy="723" rx="24" ry="13" fill="#d9a890" opacity="0.55"/></g>')
    o.append('<g id="state-mouth-clench">' + lower_face(LOWER_C) + lips_closed(True) +
             '<ellipse cx="530" cy="850" rx="44" ry="74" transform="rotate(-12 530 850)" fill="#e9b9a2" opacity="0.55"/>'
             '<path d="M468 760 C 458 820 470 890 492 940" fill="none" stroke="#c9967c" stroke-width="3" stroke-linecap="round"/>'
             '<path d="M520 800 C 540 830 548 870 546 900" fill="none" stroke="#fff3ea" stroke-width="4" stroke-linecap="round" opacity="0.7"/>'
             '<ellipse cx="540" cy="723" rx="24" ry="13" fill="#d9a890" opacity="0.55"/></g>')
    lo = LOWER_O
    stom_lo = lo[0]
    corner_lo = (309,877)
    mouth = [(271,862),(305,866),corner_lo,lo[0]]
    lower_lip = [lo[0], lo[1], lo[2], (lo[2][0]+16, lo[2][1]-8), corner_lo]
    o.append('<g id="state-mouth-open">' + lower_face(LOWER_O) +
             '<path d="%s" fill="#7a4440" stroke="#a55a54" stroke-width="3" stroke-linejoin="round"/>' % poly(mouth) +
             '<path d="M272 864 L 290 865 L 290 872 L 274 871 Z" fill="#ffffff"/>' +
             '<path d="%s" fill="#d98a83" stroke="#a55a54" stroke-width="3" stroke-linejoin="round"/>' % smooth([(258,836),(254,846),(262,857),(272,862),(305,866),(289,851),(270,840)], True) +
             '<path d="%s" fill="#e39a92" stroke="#a55a54" stroke-width="3" stroke-linejoin="round"/>' % smooth(lower_lip, True) +
             '<ellipse cx="589" cy="704" rx="11" ry="16" fill="#d9a890" opacity="0.6"/>'
             '<path d="M530 716 C 536 708 552 706 560 714" fill="none" stroke="#f7e0d0" stroke-width="5" stroke-linecap="round" opacity="0.9"/></g>')
    o.append('</svg>')
    return "\n".join(o)

TEMPORALIS = [(400,520),(420,458),(490,412),(580,400),(665,430),(720,500),(722,575),(680,630),(615,672),(575,700),(520,706),(470,700),(420,660),(398,600)]
MASSETER = [(410,714),(470,707),(560,706),(580,760),(586,850),(581,900),(545,930),(490,952),(468,880),(440,790)]

data = {
 "view": "V02", "title": "Mặt nghiêng", "svg": "V02.svg",
 "frame": {"width": 1000, "height": 1400},
 "mirrorable": True,
 "facing": "viewer-left",
 "visibleSide": "left",
 "mirrorNote": "Hình vẽ mặt nhìn sang TRÁI màn hình, nên thấy nửa mặt TRÁI của khách. Để có nửa mặt PHẢI: lật ngang toàn bộ SVG (scale(-1,1)) và đổi x -> 1 - x cho mọi điểm/đa giác/nét vuốt; đổi side 'left' -> 'right'. Trong hình nghiêng, 'side' là phía cơ thể của KHÁCH (không phải phía màn hình).",
 "sideConvention": 'customer: "left"/"right" = bên trái/phải CỦA KHÁCH (giải phẫu), không phải bên màn hình',
 "variants": {"mouth": ["mouth-closed", "mouth-clench", "mouth-open"]},
 "defaultVariants": {"mouth": "mouth-closed"},
 "midlineX": None,
 "cun": {"unitsPerCun": 0.06, "reference": "Cùng tỉ lệ đầu với V01 (60 đơn vị SVG = 1 thốn). Thái Dương = 1 thốn sau điểm giữa đuôi mày–khóe mắt ngoài; Đồng Tử Liêu = 0,5 thốn sau khóe mắt ngoài; Đầu Duy = 0,5 thốn vào chân tóc từ góc trán."},
 "landmarksSvg": {"tragus": [nx(598), ny(710)], "outerCanthus": npt(canthus), "browTail": npt(brow_tail), "mandibleAngle": npt(ANGLE), "mastoidTip": npt((742,836)), "zygomaticArchLowerEdge": [[nx(396),ny(712)],[nx(586),ny(706)]]},
 "points": [], "muscles": [], "forbidden": [], "zones": []
}
meta = {
 'EX-HN5': ("Thái Dương", 0.024, None, "Chỗ lõm 1 thốn sau điểm giữa đuôi lông mày và khóe mắt ngoài, trước chân tóc thái dương."),
 'GB1': ("Đồng Tử Liêu", 0.02, None, "0,5 thốn ngoài khóe mắt ngoài, chỗ lõm bờ ngoài hốc mắt. Gần mắt: ấn nhẹ."),
 'ST7': ("Hạ Quan", 0.022, "mouth-closed", "Chỗ lõm giữa bờ dưới cung gò má và khuyết xương hàm dưới; chỉ thấy khi ngậm miệng."),
 'SI19': ("Thính Cung", 0.02, "mouth-open", "Chỗ lõm giữa bình tai và lồi cầu xương hàm; chỉ thấy khi há miệng."),
 'TE17': ("Ế Phong", 0.022, None, "Sau dái tai, chỗ lõm giữa mỏm chũm và góc hàm dưới."),
 'ST6': ("Giáp Xa", 0.024, None, "Khoảng 1 khoát ngón tay trước-trên góc hàm, chỗ cơ cắn nổi lên khi cắn chặt (xem biến thể mouth-clench)."),
 'ST5': ("Đại Nghinh", 0.018, None, "Trước góc hàm, bờ trước cơ cắn trên bờ dưới xương hàm; có động mạch mặt: ấn nhẹ."),
 'SI18': ("Quyền Liêu", 0.022, None, "Thẳng dưới khóe mắt ngoài, chỗ lõm bờ dưới xương gò má."),
 'ST8': ("Đầu Duy", 0.024, None, "0,5 thốn vào trong chân tóc ở góc trán (nằm trên tóc). Chính xác hơn ở V01/V03."),
}
for k in ['EX-HN5','GB1','SI18','ST7','SI19','ST6','ST5','TE17','ST8']:
    name, r, var, note = meta[k]
    x, y = P[k]
    data['points'].append({"id": k, "name": name, "side": "left", "x": nx(x), "y": ny(y), "r": r, "variant": var, "note": note})
data['muscles'] = [
 {"id": "temporalis", "name": "Cơ thái dương", "side": "left", "svgPath": "m-temporalis",
  "polygon": [npt(p) for p in TEMPORALIS],
  "strokes": [{"from": npt((470,470)), "to": npt((512,672))}, {"from": npt((560,430)), "to": npt((545,676))}, {"from": npt((650,468)), "to": npt((578,674))}],
  "maxAngleDeg": 35, "minLengthRatio": 0.6,
  "note": "Vuốt từ trên xuống theo hình quạt, hội tụ về phía trước tai."},
 {"id": "masseter", "name": "Cơ cắn", "side": "left", "svgPath": "m-masseter",
  "polygon": [npt(p) for p in MASSETER],
  "strokes": [{"from": npt((455,725)), "to": npt((495,930))}, {"from": npt((520,722)), "to": npt((558,912))}],
  "maxAngleDeg": 30, "minLengthRatio": 0.6,
  "note": "Vuốt từ cung gò má xuống góc hàm, theo thớ cơ."},
]
data['forbidden'] = [
 {"id": "eyeball", "shape": "ellipse", "x": nx(334), "y": ny(651), "rx": 0.034, "ry": round(17/1400, 4),
  "message": "Không ấn vào nhãn cầu. Huyệt quanh mắt nằm trên bờ xương hốc mắt."},
 {"id": "facial-artery", "shape": "ellipse", "x": nx(478), "y": ny(1000), "rx": 0.014, "ry": round(30/1400, 4),
  "message": "Động mạch mặt đi qua bờ dưới xương hàm ở đây. Đại Nghinh chỉ ấn nhẹ, không đè sâu xuống dưới bờ hàm."},
]

s = svg()
open(OUT + '/V02.svg', 'w').write(s)
open(OUT + '/V02.json', 'w').write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
print("overlaps:", check_overlaps(data))
# render each state
import re
for st in ['mouth-closed', 'mouth-clench', 'mouth-open']:
    t = s
    for other in ['mouth-closed', 'mouth-clench', 'mouth-open']:
        if other != st:
            t = t.replace('<g id="state-%s">' % other, '<g id="state-%s" style="display:none">' % other)
    clean = t.replace('<g id="muscles"', '<g id="muscles" style="display:none"').replace('<g id="landmarks"', '<g id="landmarks" style="display:none"').replace('<g id="guides"', '<g id="guides" style="display:none"')
    open(SCR + '/V02-%s.svg' % st, 'w').write(clean)
    render(SCR + '/V02-%s.svg' % st, SCR + '/V02-%s.png' % st)
    debug_overlay(t, data, SCR + '/V02-%s-debug.svg' % st)
    render(SCR + '/V02-%s-debug.svg' % st, SCR + '/V02-%s-debug.png' % st)
