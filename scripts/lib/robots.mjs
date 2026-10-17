// robots.txt の判定（RFC 9309 の基本：自分の User-agent のグループ、なければ * のグループ。Allow/Disallow は最長一致、同じ長さなら Allow）
export const UA_TOKEN = 'FleaMarketJPBot';

export function parseRobots(txt) {
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  for (const raw of String(txt).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const v = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!cur) continue;
      if (key === 'allow' || key === 'disallow') cur.rules.push({ allow: key === 'allow', path: v });
      if (key === 'crawl-delay') cur.crawlDelay = Number(v) || undefined;
    }
  }
  return groups;
}

function toRegex(path) {
  const end = path.endsWith('$');
  const body = (end ? path.slice(0, -1) : path).split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + body + (end ? '$' : ''));
}

export function pickGroup(groups, ua = UA_TOKEN) {
  const name = ua.toLowerCase();
  return groups.find((g) => g.agents.some((a) => a !== '*' && name.includes(a))) || groups.find((g) => g.agents.includes('*')) || null;
}

// pathWithQuery は '/a/b?x=1' の形
export function isAllowed(txt, pathWithQuery, ua = UA_TOKEN) {
  const g = pickGroup(parseRobots(txt), ua);
  if (!g) return true;
  let best = null;
  for (const r of g.rules) {
    if (r.path === '') continue; // 「Disallow:」（空）は、すべて許可
    if (!toRegex(r.path).test(pathWithQuery)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow };
  }
  return best ? best.allow : true;
}

export function crawlDelay(txt, ua = UA_TOKEN) {
  return pickGroup(parseRobots(txt), ua)?.crawlDelay;
}
