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

// 取得したバイト列を文字列にする。文字コードは Content-Type、なければ <meta charset> から（Shift_JIS・EUC-JP のサイトがあるため）
export function decodeBody(bytes, contentType = '') {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  const head = new TextDecoder('latin1').decode(buf.subarray(0, 4096));
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  const label = (fromHeader || fromMeta || 'utf-8').toLowerCase().replace(/^(x-)?(sjis|shift-jis|windows-31j|cp932|ms932)$/, 'shift_jis');
  try {
    return new TextDecoder(label).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}
