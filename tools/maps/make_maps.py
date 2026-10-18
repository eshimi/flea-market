# 開催詳細の地図の画像を作る（1回だけ実行。位置のある会場の分）。使い方：
#   1) node tools/maps/geocode.mjs      … 公式の所在地から、国土地理院の住所検索で位置を求める（$MAPS_WORK/geo-raw.json）
#   2) python3 tools/maps/make_maps.py   … OpenStreetMap のタイルから static/img/maps/<id>.webp を作り、data/geo.json を書く
# 新しいシリーズに住所を足したら、再実行する（取得はタイル1枚ごとに1秒あける。OSM の利用ポリシーを守る）。位置は目安（番地まで合ったものは zoom16、町・丁目までのものは zoom15）
import json, math, os, time, urllib.request, io, datetime
from PIL import Image, ImageDraw, ImageFont
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')+'/'
P=os.environ.get('MAPS_WORK','/tmp/maps-work')+'/'; os.makedirs(P,exist_ok=True)
raw=json.load(open(P+'geo-raw.json'))
raw['kita-akabane-park-flea-smile-2026-10'].update(title='東京都北区赤羽南一丁目１４番１７号',lon=139.724136,lat=35.778004)
UA='FleaMarketJP/1.0 (+https://streetbazaars.jp; contact via site)'
os.makedirs(P+'tiles',exist_ok=True); os.makedirs(R+'static/img/maps',exist_ok=True)
def tile(z,x,y):
    f=P+'tiles/%d-%d-%d.png'%(z,x,y)
    if not os.path.exists(f):
        req=urllib.request.Request('https://tile.openstreetmap.org/%d/%d/%d.png'%(z,x,y),headers={'User-Agent':UA})
        open(f,'wb').write(urllib.request.urlopen(req,timeout=30).read()); time.sleep(1.1)
    return Image.open(f).convert('RGB')
def px(lat,lon,z):
    n=2**z; x=(lon+180)/360*n; y=(1-math.log(math.tan(math.radians(lat))+1/math.cos(math.radians(lat)))/math.pi)/2*n
    return x*256,y*256
W,H=640,400
geo={}
font=ImageFont.load_default(size=13) if hasattr(ImageFont,'load_default') else None
for sid,g in raw.items():
    t=g['title'] or ''
    lot=bool(__import__('re').search(r'[番号地]$',t))
    z=16 if lot else 15
    cx,cy=px(g['lat'],g['lon'],z)
    left,top=cx-W/2,cy-H/2
    x0,x1=int(left//256),int((left+W)//256); y0,y1=int(top//256),int((top+H)//256)
    canvas=Image.new('RGB',((x1-x0+1)*256,(y1-y0+1)*256))
    for xx in range(x0,x1+1):
        for yy in range(y0,y1+1): canvas.paste(tile(z,xx,yy),((xx-x0)*256,(yy-y0)*256))
    ox,oy=int(left-x0*256),int(top-y0*256)
    img=canvas.crop((ox,oy,ox+W,oy+H))
    d=ImageDraw.Draw(img)
    # ピン
    px_,py_=W//2,H//2
    d.polygon([(px_-9,py_-22),(px_+9,py_-22),(px_,py_)],fill=(199,62,42),outline=(255,255,255))
    d.ellipse((px_-14,py_-40,px_+14,py_-12),fill=(199,62,42),outline=(255,255,255),width=3)
    d.ellipse((px_-5,py_-31,px_+5,py_-21),fill=(255,255,255))
    # 出典
    txt='© OpenStreetMap contributors'
    tw=d.textlength(txt,font=font)
    d.rectangle((W-tw-12,H-20,W,H),fill=(255,255,255))
    d.text((W-tw-6,H-18),txt,fill=(60,60,60),font=font)
    img.save(R+'static/img/maps/%s.webp'%sid,quality=78)
    geo[sid]={'lat':round(g['lat'],6),'lon':round(g['lon'],6),'zoom':z,'precision':'lot' if lot else 'area','matched':t,'source':'国土地理院 住所検索（msearch.gsi.go.jp）で、公式の所在地から求めた位置','checkedAt':'2026-10-18'}
    print(sid,z,'ok')
json.dump(geo,open(R+'data/geo.json','w'),ensure_ascii=False,indent=1)
