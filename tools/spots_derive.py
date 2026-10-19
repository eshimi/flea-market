# 既存シリーズの公式の記載（所在地・アクセス・出典と evidence）から、スポット（会場）を作る。
# シリーズに書いてある事実だけを使う（推測しない）。会場の名前・種類・英語名・紐づけるシリーズは、下の SPOTS に手で書く。
# 使い方: python3 tools/spots_derive.py   … data/venues.json に足し、series に venueId、台帳に venues、translations-en.json の venues を足す（既存の venues は変えない）
import json, re
R='/home/user/flea-market/data/'
S=json.load(open(R+'series.json')); V=json.load(open(R+'venues.json')); SRC=json.load(open(R+'sources.json')); TR=json.load(open(R+'translations-en.json'))
# id: (名前, 種類, 英語名, [シリーズ id])
SPOTS={
 'tokyo-international-forum':('東京国際フォーラム','plaza','Tokyo International Forum',['oedo-antique-market-tokyo-international-forum','recycler-tokyo-international-forum-flea']),
 'showa-kinen-park':('国営昭和記念公園','park','Showa Kinen Park (Showa Memorial Park)',['tokyo-nominoichi-2026-autumn']),
 'takahata-fudoson':('高幡不動尊金剛寺','shrine','Takahata-Fudoson Kongoji',['takahata-fudoson-gozareichi','takahata-fudoson-recycle-market']),
 'nishiarai-daishi':('西新井大師','shrine','Nishiarai Daishi Temple',['nishiarai-daishi-ennichi-flea']),
 'tomioka-hachimangu':('富岡八幡宮','shrine','Tomioka Hachimangu Shrine',['tomioka-hachimangu-kottoichi']),
 'machida-tenmangu':('町田天満宮','shrine','Machida Tenmangu Shrine',['machida-tenmangu-garakuta-kottoichi']),
 'setagaya-park':('区立世田谷公園','park','Setagaya Ward Park (Setagaya Park)',['setagaya-park-flea']),
 'kiba-park':('都立木場公園','park','Tokyo Metropolitan Kiba Park',['recycler-kiba-park-flea']),
 'ajinomoto-stadium':('味の素スタジアム','other','Ajinomoto Stadium',['recycler-ajinomoto-stadium-flea']),
 'fussa-baseside-street':('福生ベースサイドストリート','plaza','Fussa Baseside Street (Friendship Park)',['recycler-fussa-baseside-street']),
 'akabane-park':('赤羽公園','park','Akabane Park',['frma-akabane-park-flea','fmpn-akabane-park','kita-akabane-park-flea-smile-2026-10']),
 'kinshi-park':('錦糸公園','park','Kinshi Park',['sumida-kinshi-park-flea','recycler-sumida-live-fes-2026-winter-flea']),
 'naka-ikebukuro-park':('中池袋公園','park','Naka-Ikebukuro Park',['toshima-nakaikebukuro-park-flea-2026-12','toshima-nakaikebukuro-park-flea-2026-11']),
 'hanakawado-park':('花川戸公園','park','Hanakawado Park',['taito-hanakawado-park-flea']),
 'arakawa-park':('荒川公園','park','Arakawa Park',['arakawa-park-flea-2027-03']),
 'ukima-park':('浮間公園','park','Ukima Park',['frma-ukima-park-flea']),
 'akatsuka-park':('赤塚公園','park','Akatsuka Park',['frma-akatsuka-park-flea']),
 'oshima-komatsugawa-park':('大島小松川公園','park','Oshima Komatsugawa Park',['frma-komatsugawa-park-flea']),
 'shinjuku-central-park':('新宿中央公園','park','Shinjuku Central Park',['mottainai-flea-shinjuku-chuo-park']),
 'nakano-central-park':('中野セントラルパーク','plaza','Nakano Central Park',['mottainai-flea-nakano-central-park']),
 'kichijoji-parco':('吉祥寺パルコ','commercial','Kichijoji Parco',['mottainai-flea-kichijoji-parco']),
 'zoshigaya-kishimojin':('雑司ヶ谷 鬼子母神','shrine','Zoshigaya Kishimojin',['zoshigaya-tezukuriichi']),
 'ikegami-honmonji':('池上本門寺','shrine','Ikegami Honmonji Temple',['ikegami-biyori-marche']),
 'kibogaoka-park':('希望丘公園','park','Kibogaoka Park',['setagaya-funabashi-fureai-matsuri-flea-2026']),
}
have={v['id'] for v in V}; byid={s['id']:s for s in S}; ledger={x['url']:x for x in SRC}
def core(n): return re.sub(r'(公園|神社|寺|金剛寺|スタジアム|フォーラム)$','',n)
for vid,(name,kind,en,sids) in SPOTS.items():
    if vid in have: continue
    ss=[byid[i] for i in sids]; vs=[s['venue'] for s in ss]
    first=lambda k: next((v[k] for v in vs if v.get(k)),None)
    area={'pref':vs[0]['pref']}
    c=first('cityCode'); ct=first('city')
    if ct: area['city']=ct
    if c: area['cityCode']=c
    v={'id':vid,'name':name,'kind':kind,'area':area}
    # 開催場所：シリーズの会場名が「<名前> <場所>」の形のとき
    places=[]
    for x in vs:
        m=re.match(re.escape(name.replace('区立','').replace('都立','').replace('国営',''))+r'[ 　]+(.+)$',x['name'])
        if m and m.group(1) not in places: places.append(m.group(1))
    if places: v['place']='、'.join(places)
    if first('address'): v['address']=first('address')
    if first('access'): v['access']=first('access')
    srcs=[];seen=set()
    for s in ss:
        for x in s['sources']:
            if x['url'] in seen: continue
            seen.add(x['url'])
            ev=[e for e in x.get('evidence',[]) if core(name) in e or (first('address') and any(t in e for t in re.findall(r'[0-9]+',first('address'))))]
            if not ev: ev=x.get('evidence',[])[:1]
            srcs.append({'url':x['url'],'type':'municipal' if x['type']=='municipality' else 'official','checkedAt':x['checkedAt'],'evidence':ev})
    v['sources']=srcs[:4]
    V.append(v)
    for s in ss: s['venueId']=vid
    for x in v['sources']:
        e=ledger[x['url']]; e.setdefault('venues',[]); e['venues']=sorted(set(e['venues'])|{vid})
    # 英訳：series の訳から
    t={'name':en}
    st=[TR['series'].get(i,{}) for i in sids]
    firsttr=lambda k: next((x[k] for x in st if x.get(k)),None)
    if v.get('address') and firsttr('address'): t['address']=firsttr('address')
    if v.get('access') and firsttr('access'): t['access']=firsttr('access')
    if v.get('place'):
        pl=[]
        for x in st:
            m=re.match(r'^[^,]+?, (.+)$',x.get('venue',''))
            if m: pl.append(m.group(1))
        t['place']=', '.join(dict.fromkeys(pl)) if pl else v['place']
    TR.setdefault('venues',{})[vid]=t
json.dump(V,open(R+'venues.json','w'),ensure_ascii=False,indent=1)
json.dump(S,open(R+'series.json','w'),ensure_ascii=False,indent=1)
json.dump(SRC,open(R+'sources.json','w'),ensure_ascii=False,indent=1)
json.dump(TR,open(R+'translations-en.json','w'),ensure_ascii=False,indent=1)
print(len(V))
