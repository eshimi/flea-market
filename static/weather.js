// 開催詳細：当日の天気予報（気象庁。/api/weather/<府県予報区コード> で中継）。開催日が今日から7日以内のときだけ出す
(() => {
  document.querySelectorAll('.wx').forEach(async (box) => {
    const { office, area, date, lang } = box.dataset;
    const ja = lang === 'ja';
    const st = box.querySelector('.wx-st');
    const msg = (t) => { st.textContent = t; };
    const jst = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(d);
    const days = Math.round((Date.parse(date) - Date.parse(jst(new Date()))) / 864e5);
    if (days < 0) return msg(ja ? '開催日をすぎています。' : 'This date has passed.');
    if (days > 7) return msg(ja ? '予報は、開催日の約7日前から表示します。' : 'The forecast is shown from about 7 days before the event.');
    const T = {
      1: ['Sunny', '☀️'], 2: ['Cloudy', '☁️'], 3: ['Rain', '🌧️'], 4: ['Snow', '❄️'],
    };
    const EN = { 100: 'Sunny', 101: 'Sunny, occasionally cloudy', 102: 'Sunny, occasional rain', 103: 'Sunny, occasional rain', 104: 'Sunny, occasional snow', 110: 'Sunny, later cloudy', 111: 'Sunny, later cloudy', 112: 'Sunny, later rain', 113: 'Sunny, later rain', 114: 'Sunny, later rain', 115: 'Sunny, later snow', 200: 'Cloudy', 201: 'Cloudy, occasionally sunny', 202: 'Cloudy, occasional rain', 203: 'Cloudy, occasional rain', 204: 'Cloudy, occasional snow', 210: 'Cloudy, later sunny', 211: 'Cloudy, later sunny', 212: 'Cloudy, later rain', 213: 'Cloudy, later rain', 214: 'Cloudy, later rain', 215: 'Cloudy, later snow', 300: 'Rain', 301: 'Rain, occasionally sunny', 302: 'Rain, occasionally cloudy', 303: 'Rain and snow', 308: 'Heavy rain', 311: 'Rain, later sunny', 313: 'Rain, later cloudy', 314: 'Rain, later snow', 400: 'Snow', 401: 'Snow, occasionally sunny', 402: 'Snow, occasionally cloudy', 403: 'Snow and rain', 411: 'Snow, later sunny', 413: 'Snow, later cloudy', 414: 'Snow, later rain' };
    const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const JA = { 100: '晴れ', 101: '晴れ時々くもり', 102: '晴れ一時雨', 103: '晴れ時々雨', 104: '晴れ一時雪', 110: '晴れのち時々くもり', 111: '晴れのちくもり', 112: '晴れのち一時雨', 113: '晴れのち時々雨', 114: '晴れのち雨', 115: '晴れのち一時雪', 200: 'くもり', 201: 'くもり時々晴れ', 202: 'くもり一時雨', 203: 'くもり時々雨', 204: 'くもり一時雪', 210: 'くもりのち時々晴れ', 211: 'くもりのち晴れ', 212: 'くもりのち一時雨', 213: 'くもりのち時々雨', 214: 'くもりのち雨', 215: 'くもりのち一時雪', 300: '雨', 301: '雨時々晴れ', 302: '雨時々くもり', 303: '雨時々雪', 308: '大雨', 311: '雨のち晴れ', 313: '雨のちくもり', 314: '雨のち雪', 400: '雪', 401: '雪時々晴れ', 402: '雪時々くもり', 403: '雪時々雨', 411: '雪のち晴れ', 413: '雪のちくもり', 414: '雪のち雨' };
    const JA1 = { 1: '晴れ', 2: 'くもり', 3: '雨', 4: '雪' };
    const icon = (c) => (T[String(c)[0]] || ['', '·'])[1];
    const text = (c) => EN[c] || (T[String(c)[0]] || ['Forecast'])[0];
    try {
      const res = await fetch(`/api/weather/${encodeURIComponent(office)}`);
      if (!res.ok) throw new Error(res.status);
      const [short, weekly] = await res.json();
      const sameDay = (iso) => iso.slice(0, 10) === date;
      let code = null; let jaText = ''; let pops = []; let tmin = null; let tmax = null; let areaName = '';
      const ts = short.timeSeries;
      const i = ts[0].timeDefines.findIndex(sameDay);
      if (i >= 0) {
        const a = ts[0].areas.find((x) => x.area.code === area) || ts[0].areas[0];
        areaName = a.area.name; code = a.weatherCodes[i]; jaText = (a.weathers[i] || '').replace(/\s+/g, ' ');
        const p = (ts[1].areas.find((x) => x.area.code === area) || ts[1].areas[0]);
        pops = ts[1].timeDefines.map((t, k) => [t, p.pops[k]]).filter(([t, v]) => sameDay(t) && v !== '' && v != null).map(([t, v]) => [+t.slice(11, 13), v]);
        const tt = ts[2].areas[0];
        ts[2].timeDefines.forEach((t, k) => { if (!sameDay(t)) return; const v = tt.temps[k]; if (+t.slice(11, 13) === 0) tmin = v; else tmax = v; });
      } else {
        const w = weekly.timeSeries[0];
        const j = w.timeDefines.findIndex(sameDay);
        if (j < 0) return msg(ja ? '予報はまだありません。' : 'No forecast yet.');
        const a = w.areas[0];
        areaName = a.area.name; code = a.weatherCodes[j];
        if (a.pops[j] !== '' && a.pops[j] != null) pops = [[null, a.pops[j]]];
        const t = weekly.timeSeries[1];
        const k = t.timeDefines.findIndex(sameDay);
        if (k >= 0) { tmin = t.areas[0].tempsMin[k] || null; tmax = t.areas[0].tempsMax[k] || null; }
      }
      const slot = (h) => ({ 0: '0–6', 6: '6–12', 12: '12–18', 18: '18–24' }[h]);
      const popText = pops.map(([h, v]) => (h == null ? `${v}%` : `${slot(h)}${ja ? '時' : 'h'} ${v}%`)).join(' / ');
      const temp = [tmin != null && tmin !== '' ? `${ja ? '最低' : 'Low'} ${tmin}°C` : '', tmax != null && tmax !== '' ? `${ja ? '最高' : 'High'} ${tmax}°C` : ''].filter(Boolean).join(' / ');
      const area_ = ja ? areaName : `${box.dataset.region} (${areaName})`;
      box.innerHTML = `<div class="wx-main"><span class="wx-ic" aria-hidden="true">${icon(code)}</span><div><b>${esc(ja ? (jaText || JA[code] || JA1[String(code)[0]] || '') : text(code))}</b>${!ja && jaText ? `<small class="orig" lang="ja">${esc(jaText)}</small>` : ''}</div></div><dl class="wx-dl">${popText ? `<div><dt>${ja ? '降水確率' : 'Chance of rain'}</dt><dd>${popText}</dd></div>` : ''}${temp ? `<div><dt>${ja ? '気温' : 'Temperature'}</dt><dd>${temp}</dd></div>` : ''}<div><dt>${ja ? '予報区' : 'Forecast area'}</dt><dd>${esc(area_)}</dd></div></dl>`;
    } catch {
      msg(ja ? '予報を読み込めませんでした。時間をおいてお試しください。' : 'The forecast could not be loaded. Please try again later.');
    }
  });
})();
