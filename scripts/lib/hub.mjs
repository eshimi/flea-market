// 地域・種類の一覧ページ（ハブ）の解説ブロック。手書きの文は data/hub-content.json に入れる（後で CMS やマスターデータから流し込める形）。
//   { "area": { "<都道府県コード>": { "en": "…", "ja": "…" } }, "city": { "<市区町村コード>": {…} }, "kind": { "<種類>": {…} } }
// キーがないページは、掲載データから作る事実だけの短い導入文（build-site.mjs の hubAuto）を出す。
export const HUB_TYPES = ['area', 'city', 'kind'];
export const HUB_RANGE = { ja: [150, 400], en: [200, 600] }; // 目安の文字数（外れると警告。上限の倍を超えるとエラー）

export function hubText(hub, type, key, lang) {
  const t = hub?.[type]?.[key]?.[lang];
  return typeof t === 'string' && t.trim() ? t.trim() : '';
}

// data/hub-content.json の検証。errs＝直すもの、warns＝目安から外れるもの
export function validateHub(hub, { prefs, cities, kinds }) {
  const errs = [];
  const warns = [];
  for (const type of Object.keys(hub || {})) {
    if (!HUB_TYPES.includes(type)) { errs.push(`hub-content: 種類 ${type} は使えません`); continue; }
    const ok = type === 'area' ? prefs : type === 'city' ? cities : kinds;
    for (const [key, v] of Object.entries(hub[type] || {})) {
      if (!ok.has(key)) errs.push(`hub-content.${type}.${key}: 該当するページがありません`);
      for (const lang of ['en', 'ja']) {
        const t = v?.[lang];
        if (typeof t !== 'string' || !t.trim()) { errs.push(`hub-content.${type}.${key}.${lang}: 文がありません（英語・日本語の両方が要ります）`); continue; }
        const [lo, hi] = HUB_RANGE[lang];
        if (t.length > hi * 2) errs.push(`hub-content.${type}.${key}.${lang}: 長すぎます（${t.length}字）`);
        else if (t.length < lo || t.length > hi) warns.push(`hub-content.${type}.${key}.${lang}: ${t.length}字（目安 ${lo}〜${hi}字）`);
      }
    }
  }
  return { errs, warns };
}
