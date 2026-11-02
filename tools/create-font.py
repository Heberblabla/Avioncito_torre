"""Fuente bitmap original; solo se necesita Python + fontTools para regenerarla."""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from pathlib import Path
patterns={
'A':['01110','11011','11011','11111','11011','11011','11011'],
'B':['11110','11011','11011','11110','11011','11011','11110'],
'C':['01111','11000','11000','11000','11000','11000','01111'],
'D':['11110','11011','11011','11011','11011','11011','11110'],
'E':['11111','11000','11000','11110','11000','11000','11111'],
'F':['11111','11000','11000','11110','11000','11000','11000'],
'G':['01111','11000','11000','11011','11011','11011','01111'],
'H':['11011','11011','11011','11111','11011','11011','11011'],
'I':['11111','00100','00100','00100','00100','00100','11111'],
'J':['00111','00011','00011','00011','11011','11011','01110'],
'K':['11011','11011','11110','11100','11110','11011','11011'],
'L':['11000','11000','11000','11000','11000','11000','11111'],
'M':['10001','11011','11111','10101','10001','10001','10001'],
'N':['11001','11001','11101','11111','11011','11011','11001'],
'O':['01110','11011','11011','11011','11011','11011','01110'],
'P':['11110','11011','11011','11110','11000','11000','11000'],
'Q':['01110','11011','11011','11011','11111','01110','00011'],
'R':['11110','11011','11011','11110','11100','11010','11011'],
'S':['01111','11000','11000','01110','00011','00011','11110'],
'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['11011','11011','11011','11011','11011','11011','01110'],
'V':['11011','11011','11011','11011','11011','01010','00100'],
'W':['10001','10001','10001','10101','11111','11011','10001'],
'X':['11011','11011','01010','00100','01010','11011','11011'],
'Y':['11011','11011','11011','01110','00100','00100','00100'],
'Z':['11111','00011','00110','01100','11000','11000','11111'],
'0':['01110','11011','11011','11011','11011','11011','01110'],
'1':['00100','01100','00100','00100','00100','00100','01110'],
'2':['01110','11011','00011','00110','01100','11000','11111'],
'3':['11110','00011','00011','01110','00011','00011','11110'],
'4':['00011','00111','01011','11011','11111','00011','00011'],
'5':['11111','11000','11000','11110','00011','00011','11110'],
'6':['01110','11000','11000','11110','11011','11011','01110'],
'7':['11111','00011','00110','00100','01100','01100','01100'],
'8':['01110','11011','11011','01110','11011','11011','01110'],
'9':['01110','11011','11011','01111','00011','00011','01110'],
'/':['00001','00011','00010','00100','01000','11000','10000'],
'.':['00000','00000','00000','00000','00000','01100','01100'],
'-':['00000','00000','00000','11111','00000','00000','00000'],
' ':['00000']*7}
fb=FontBuilder(800,isTTF=True)
names={ch:('space' if ch==' ' else 'uni%04X'%ord(ch)) for ch in patterns}
order=['.notdef']+list(names.values());fb.setupGlyphOrder(order)
glyphs={};metrics={}
for ch,name in [('', '.notdef')]+list(names.items()):
 pen=TTGlyphPen(None)
 # Fusionar celdas vecinas en contornos: evita líneas finas entre píxeles al escalar.
 edges=set()
 for row,bits in enumerate(patterns.get(ch,[])):
  for col,v in enumerate(bits):
   if v!='1':continue
   x=col*100;y=600-row*100
   corners=[(x,y),(x,y+100),(x+100,y+100),(x+100,y)]
   for a,b in zip(corners,corners[1:]+corners[:1]):
    if (b,a) in edges:edges.remove((b,a))
    else:edges.add((a,b))
 while edges:
  a,b=edges.pop();points=[a,b]
  while points[-1]!=a:
   edge=next(e for e in edges if e[0]==points[-1]);edges.remove(edge);points.append(edge[1])
  pen.moveTo(points[0])
  for point in points[1:-1]:pen.lineTo(point)
  pen.closePath()
 glyphs[name]=pen.glyph();metrics[name]=(600,0)
fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=750,descent=-50)
fb.setupCharacterMap({ord(ch):name for ch,name in names.items()})
fb.setupNameTable({'familyName':'AvPixel','styleName':'Regular','uniqueFontIdentifier':'AvioncitoPixel-1','fullName':'AvPixel Regular','psName':'AvPixel-Regular'})
fb.setupOS2(sTypoAscender=750,sTypoDescender=-50,usWinAscent=750,usWinDescent=50)
fb.setupPost();fb.setupMaxp();fb.font.flavor='woff'
out=Path(__file__).resolve().parents[1]/'assets/av-pixel.woff';fb.save(out)
print(out, out.stat().st_size, 'bytes')
