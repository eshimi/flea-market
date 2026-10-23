import json,glob,sys,copy,re
import os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','data')+'/'; W=(os.environ.get('QUEUE_WORK') or os.getcwd()).rstrip('/')+'/'
S=json.load(open(R+'series.json')); D=json.load(open(R+'sources.json')); T=json.load(open(R+'translations-en.json')); O=json.load(open(R+'occurrences.json')); Q=json.load(open(R+'review-queue.json'))
by={s['id']:s for s in S}; srcs={d['url']:d for d in D}; qid={q['id']:q for q in Q}
import datetime
TODAY=(datetime.datetime.utcnow()+datetime.timedelta(hours=9)).strftime('%Y-%m-%d')
CITY={'鳴門市':'36202','武蔵村山市':'13303','大阪市阿倍野区':'27109'}
ADDR_EN={'lohas-park-naruto-uchinoumi':'679 Takashima-kita, Naruto-cho, Naruto-shi, Tokushima','lohas-park-musashimurayama-aeon':'1-1-34 Enoki, Musashimurayama-shi, Tokyo'}
RAIN_EN='Held in rain (may be cancelled in severe weather; there is no rain date)'
tmpl=[d for d in D if 'lohas-park' in d['url']][0]
retry=re.compile('取得せず|取得できな|要再試行|メンテナンス|届かず|403|ECONNRESET')
n={'dates':0,'new':0,'occ':0,'done':0}
for f in sorted(glob.glob(W+'out/queue-*.json')):
    for x in json.load(open(f)):
        for a in x.get('addDates',[]):
            s=by[a['series']]; r=s['recurrence']
            assert r['type']=='dates',a['series']
            r['dates']=sorted(set(r['dates'])|set(a['dates'])); n['dates']+=len(a['dates'])
            ent=next((y for y in s['sources'] if y['url']==a['url']),None)
            if ent: ent['evidence']=list(dict.fromkeys(ent.get('evidence',[])+a['evidence']))
            else: s['sources'].append({'url':a['url'],'type':'organizer','checkedAt':TODAY,'evidence':a['evidence']})
        for ns in x.get('newSeries',[]):
            if ns['id'] in by: continue
            en=ns.pop('en'); 
            if ns['venue'].get('city'): ns['venue']['cityCode']=CITY[ns['venue']['city']]
            for sc in ns['sources']:
                sc['checkedAt']=TODAY
                if sc['url'] not in srcs:
                    e=copy.deepcopy(tmpl); e['url']=sc['url']; e['series']=[ns['id']]; e['terms']['checkedAt']=TODAY; D.append(e); srcs[sc['url']]=e
            S.append(ns); by[ns['id']]=ns
            tr={k:en[k] for k in ('name','venue','rule','time') if en.get(k)}
            if ns['id'] in ADDR_EN: tr['address']=ADDR_EN[ns['id']]
            if ns.get('visitor',{}).get('rain'): tr['rain']=RAIN_EN
            T['series'][ns['id']]=tr; n['new']+=1
        for u in x.get('occurrenceUpdates',[]):
            if not any(o['series']==u['series'] and o['date']==u['date'] for o in O):
                O.append({'series':u['series'],'date':u['date'],'status':u['status'],'checkedAt':u['checkedAt'],'source':u['url'],'reason':u.get('note','')}); n['occ']+=1
        q=qid.get(x['id'])
        if q and q['status']=='pending' and not retry.search(x.get('note','')):
            q['status']='done'; q['processedAt']=TODAY; n['done']+=1
for fn,obj in (('series',S),('sources',D),('translations-en',T),('occurrences',O),('review-queue',Q)): json.dump(obj,open(R+fn+'.json','w'),ensure_ascii=False,indent=1)
print(n)
