# スポット（会場）の地図の画像を作る。公式の所在地（venues.json の address）から、国土地理院の住所検索で位置を求め、
# OpenStreetMap のタイルから static/img/maps/spot-<id>.webp を作り、data/geo.json に spot-<id> として足す（既存の分は変えない）。
# 使い方: python3 tools/maps/make_spot_maps.py   … 住所を足したら再実行（タイルは1枚ごとに1秒あける。OSM の利用ポリシーを守る）
import json, math, os, re, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')+'/'
P=os.environ.get('MAPS_WORK','/tmp/maps-work')+'/'; os.makedirs(P+'tiles',exist_ok=True)
UA='FleaMarketJP/1.0 (+https://streetbazaars.jp; contact via site)'
venues=json.load(open(R+'data/venues.json')); geo=json.load(open(R+'data/geo.json'))
def query(v):
    a=re.sub(r'（[^）]*）|\([^)]*\)','',v['address']); a=a.split('、')[0].strip()
    if not a.startswith('東京都') and v['area']['pref']=='13': a='東京都'+a
    return a
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
font=ImageFont.load_default(size=13)
for v in venues:
    if not v.get('address'): continue
    q=query(v)
    req=urllib.request.Request('https://msearch.gsi.go.jp/address-search/AddressSearch?q='+urllib.parse.quote(q),headers={'User-Agent':UA})
    j=json.load(urllib.request.urlopen(req,timeout=30)); time.sleep(1.2)
    if not j: print(v['id'],'位置なし',q); continue
    f=j[0]; title=f['properties']['title']; lon,lat=f['geometry']['coordinates']
    lot=bool(re.search(r'[番号地]$',title)); z=16 if lot else 15
    cx,cy=px(lat,lon,z); left,top=cx-W/2,cy-H/2
    x0,x1=int(left//256),int((left+W)//256); y0,y1=int(top//256),int((top+H)//256)
    canvas=Image.new('RGB',((x1-x0+1)*256,(y1-y0+1)*256))
    for xx in range(x0,x1+1):
        for yy in range(y0,y1+1): canvas.paste(tile(z,xx,yy),((xx-x0)*256,(yy-y0)*256))
    ox,oy=int(left-x0*256),int(top-y0*256); img=canvas.crop((ox,oy,ox+W,oy+H)); d=ImageDraw.Draw(img)
    p_x,p_y=W//2,H//2
    d.polygon([(p_x-9,p_y-22),(p_x+9,p_y-22),(p_x,p_y)],fill=(199,62,42),outline=(255,255,255))
    d.ellipse((p_x-14,p_y-40,p_x+14,p_y-12),fill=(199,62,42),outline=(255,255,255),width=3)
    d.ellipse((p_x-5,p_y-31,p_x+5,p_y-21),fill=(255,255,255))
    txt='© OpenStreetMap contributors'; tw=d.textlength(txt,font=font)
    d.rectangle((W-tw-12,H-20,W,H),fill=(255,255,255)); d.text((W-tw-6,H-18),txt,fill=(60,60,60),font=font)
    img.save(R+'static/img/maps/spot-%s.webp'%v['id'],quality=78)
    geo['spot-'+v['id']]={'lat':round(lat,6),'lon':round(lon,6),'zoom':z,'precision':'lot' if lot else 'area','matched':title,'source':'国土地理院 住所検索（msearch.gsi.go.jp）で、公式の所在地から求めた位置','checkedAt':time.strftime('%Y-%m-%d')}
    print(v['id'],q,'=>',title,z)
json.dump(geo,open(R+'data/geo.json','w'),ensure_ascii=False,indent=1)
