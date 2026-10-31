#!/usr/bin/env python3
"""国土数値情報「鉄道データ（N02-23）」から、マップ用の線・駅を作る。
出典：国土交通省 国土数値情報（鉄道データ）を加工して作成。利用条件は公共データ利用規約（第1.0版）。
使い方：python3 tools/rail/make_rail.py <N02の UTF-8 フォルダ> <出力フォルダ（static/rail）>
座標は、マップの SVG 座標（x = 17.6×経度 − 2182、y = −20×緯度 + 936）に直して小数2桁で出す。"""
import json, sys, collections
src, out = sys.argv[1], sys.argv[2]
P = lambda lo, la: (17.6 * lo - 2182, -20 * la + 936)

def dp(pts, tol):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = (dx * dx + dy * dy) ** .5 or 1e-9
    imax, dmax = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / L
        if d > dmax: imax, dmax = i, d
    if dmax > tol: return dp(pts[:imax + 1], tol)[:-1] + dp(pts[imax:], tol)
    return [a, b]

cats = {'s': [], 'j': [], 'o': []}
for f in json.load(open(src + '/N02-23_RailroadSection.geojson'))['features']:
    pr = f['properties']; g = f['geometry']
    lines = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
    c = {'1': 's', '2': 'j'}.get(pr['N02_002'], 'o')
    for ln in lines:
        pts = [P(x, y) for x, y in ln]
        if all((936 - p[1]) / 20 < 27.5 for p in pts): continue  # 沖縄は形をずらして置くため出さない
        pts = dp(pts, 0.03)
        cats[c].append('M' + 'L'.join(f'{x:.2f},{y:.2f}' for x, y in pts))
open(out + '/shinkansen.json', 'w').write(json.dumps({'s': ''.join(cats['s'])}, separators=(',', ':')))
open(out + '/lines.json', 'w').write(json.dumps({'j': ''.join(cats['j']), 'o': ''.join(cats['o'])}, separators=(',', ':')))

EN = {'東京':'Tokyo','品川':'Shinagawa','渋谷':'Shibuya','新宿':'Shinjuku','池袋':'Ikebukuro','上野':'Ueno','秋葉原':'Akihabara','横浜':'Yokohama','新横浜':'Shin-Yokohama','大宮':'Omiya','川崎':'Kawasaki','千葉':'Chiba','立川':'Tachikawa','吉祥寺':'Kichijoji','銀座':'Ginza','原宿':'Harajuku','名古屋':'Nagoya','京都':'Kyoto','大阪':'Osaka','新大阪':'Shin-Osaka','難波':'Namba','広島':'Hiroshima','博多':'Hakata','札幌':'Sapporo','仙台':'Sendai','金沢':'Kanazawa','新潟':'Niigata','岡山':'Okayama','三ノ宮':'Sannomiya','奈良':'Nara','熊本':'Kumamoto','鹿児島中央':'Kagoshima-Chuo','盛岡':'Morioka','新青森':'Shin-Aomori','浜松':'Hamamatsu','静岡':'Shizuoka','長野':'Nagano','高崎':'Takasaki','福岡空港':'Fukuoka Airport','天王寺':'Tennoji','梅田':'Umeda','錦糸町':'Kinshicho','北千住':'Kita-Senju','高尾':'Takao','八王子':'Hachioji','府中':'Fuchu','調布':'Chofu','町田':'Machida','日暮里':'Nippori','神田':'Kanda','新橋':'Shimbashi','有楽町':'Yurakucho','御茶ノ水':'Ochanomizu','四ツ谷':'Yotsuya','恵比寿':'Ebisu','目黒':'Meguro','五反田':'Gotanda','高田馬場':'Takadanobaba','中野':'Nakano','荻窪':'Ogikubo','三鷹':'Mitaka','西荻窪':'Nishi-Ogikubo','浅草':'Asakusa','お台場海浜公園':'Odaiba-kaihinkoen'}
grp = collections.defaultdict(lambda: {'lines': set(), 'pts': [], 'sh': False, 'name': ''})
for f in json.load(open(src + '/N02-23_Station.geojson'))['features']:
    pr = f['properties']; g = f['geometry']
    G = grp[pr['N02_005g']]; G['name'] = pr['N02_005']
    G['lines'].add((pr['N02_003'], pr['N02_004'])); G['sh'] |= pr['N02_002'] == '1'
    cs = g['coordinates'] if g['type'] == 'LineString' else [g['coordinates']]
    G['pts'] += cs
st = []
for G in grp.values():
    n = len(G['lines'])
    if n < 2 and not G['sh']: continue
    x = sum(p[0] for p in G['pts']) / len(G['pts']); y = sum(p[1] for p in G['pts']) / len(G['pts'])
    X, Y = P(x, y)
    if (936 - Y) / 20 < 27.5: continue
    e = {'n': G['name'], 'x': round(X, 2), 'y': round(Y, 2), 'p': n + (3 if G['sh'] else 0)}
    if G['name'] in EN: e['e'] = EN[G['name']]
    st.append(e)
st.sort(key=lambda e: -e['p'])
open(out + '/stations.json', 'w').write(json.dumps(st, ensure_ascii=False, separators=(',', ':')))
print({k: len(v) for k, v in cats.items()}, len(st))
