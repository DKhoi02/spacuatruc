import math
OUT='/Users/dangkhoi/Documents/Project/spa_web_game/art/views/V15.svg'
# matches V06: bladder lines x=452/548; levels below T3, T7, T11, L2 (y = spinous centre + 17)
places = [(452,421,'BL13'),(548,421,'BL13'),(452,567,'BL17'),(548,567,'BL17'),
          (452,721,'BL20'),(548,721,'BL20'),(452,847,'BL23'),(548,847,'BL23')]
rot = [-8, 6, 4, -5, -6, 8, 5, -4]
size = [(31,22),(30,23),(34,24),(33,23),(34,25),(35,24),(36,25),(35,25)]
L=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400">',
   '  <title>V15 – Đá nóng trên lưng (lớp phủ V06)</title>',
   '  <defs>',
   '    <radialGradient id="stone-shine" cx="0.38" cy="0.32" r="0.75">',
   '      <stop offset="0" stop-color="#6a625d"/><stop offset="0.55" stop-color="#4a4340"/><stop offset="1" stop-color="#2f2a28"/>',
   '    </radialGradient>',
   '    <radialGradient id="stone-glow" cx="0.5" cy="0.5" r="0.5">',
   '      <stop offset="0" stop-color="#e8b46a" stop-opacity="0.45"/><stop offset="1" stop-color="#e8b46a" stop-opacity="0"/>',
   '    </radialGradient>',
   '  </defs>',
   '  <g id="stones" stroke-linejoin="round" stroke-linecap="round">']
for i,((x,y,code),a,(rx,ry)) in enumerate(zip(places,rot,size),1):
    # slightly irregular pebble outline
    pts=[]
    for k in range(8):
        t=2*math.pi*k/8
        j=1+0.03*math.sin(2*t+i)
        pts.append((rx*j*math.cos(t), ry*j*math.sin(t)))
    d='M%.1f,%.1f '%pts[0]
    n=len(pts)
    for k in range(n):
        p0=pts[k]; p1=pts[(k+1)%n]
        # smooth via quadratic-ish cubic with tangent approximations
        pm=pts[(k-1)%n]; p2=pts[(k+2)%n]
        c1=(p0[0]+(p1[0]-pm[0])/6, p0[1]+(p1[1]-pm[1])/6)
        c2=(p1[0]-(p2[0]-p0[0])/6, p1[1]-(p2[1]-p0[1])/6)
        d+='C%.1f,%.1f %.1f,%.1f %.1f,%.1f '%(c1+c2+p1)
    d+='Z'
    L.append(f'    <g id="stone-{i}" data-point="{code}" transform="translate({x} {y}) rotate({a})">')
    L.append(f'      <ellipse cx="0" cy="4" rx="{rx+16}" ry="{ry+14}" fill="url(#stone-glow)"/>')
    L.append(f'      <ellipse cx="2" cy="6" rx="{rx}" ry="{ry-4}" fill="#7a5a48" opacity="0.25"/>')
    L.append(f'      <path d="{d}" fill="url(#stone-shine)" stroke="#2a2422" stroke-width="3"/>')
    L.append(f'      <path d="M{-rx*0.55:.1f},{-ry*0.35:.1f} C{-rx*0.3:.1f},{-ry*0.62:.1f} {rx*0.1:.1f},{-ry*0.66:.1f} {rx*0.3:.1f},{-ry*0.55:.1f}" fill="none" stroke="#9a918b" stroke-width="3" opacity="0.8"/>')
    # heat shimmer (not rotated with stone: counter-rotate)
    L.append(f'      <g class="heat" transform="rotate({-a})" fill="none" stroke="#e8b46a" stroke-width="2.5" opacity="0.7">')
    for dx in (-12, 4, 18):
        y0=-ry-6
        L.append(f'        <path d="M{dx},{y0} c-6,-6 6,-10 0,-16 c-6,-6 6,-10 0,-16"/>')
    L.append('      </g>')
    L.append('    </g>')
L.append('  </g>')
L.append('</svg>')
open(OUT,'w').write('\n'.join(L)+'\n')
# preview composited on V06
v6=open('/Users/dangkhoi/Documents/Project/spa_web_game/art/views/V06.svg').read()
inner='\n'.join(L[2:-1])
open('v15-on-v06.svg','w').write(v6.replace('</svg>', inner+'\n</svg>'))
