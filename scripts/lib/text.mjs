// 取得した公式ページの本文を、突き合わせ用の文字列にする
export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d|dd|dt|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}

// 全角英数・空白の違い、〜/～ の違いを吸収する
export function normalize(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/[〜～~]/g, '〜')
    .replace(/[‐−–—―]/g, '-')
    .replace(/\s+/g, '');
}

// evidence（公式の本文にそのまま書いてある短い語句）が、すべて本文にあるか
export function checkEvidence(text, evidence = []) {
  const t = normalize(text);
  const missing = evidence.filter((e) => !t.includes(normalize(e)));
  return { ok: missing.length === 0 && evidence.length > 0, missing };
}
