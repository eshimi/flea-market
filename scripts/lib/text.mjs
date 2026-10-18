import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 取得した公式ページの本文を、突き合わせ用の文字列にする
export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d|dd|dt|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|emsp|ensp|thinsp);/g, ' ')
    .replace(/&times;/g, '×')
    .replace(/&(ndash|mdash);/g, '-')
    .replace(/&hellip;/g, '…')
    .replace(/&yen;/g, '円')
    .replace(/&copy;/g, '©')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}

// PDF の本文（poppler の pdftotext を使う。なければ例外）
export function pdfToText(bytes) {
  const dir = mkdtempSync(join(tmpdir(), 'fmjp-'));
  const file = join(dir, 'in.pdf');
  try {
    writeFileSync(file, bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    throw new Error(e.code === 'ENOENT' ? 'pdftotext がありません（poppler-utils が必要）' : 'PDF を読めません');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
  // 宣言がなく、UTF-8 としても読めないものは、Shift_JIS（市報のテキストなど）として読む
  const label = (fromHeader || fromMeta || 'shift_jis').toLowerCase().replace(/^(x-)?(sjis|shift-jis|windows-31j|cp932|ms932)$/, 'shift_jis');
  // 宣言が Shift_JIS などでも、バイト列が正しい UTF-8 として読めるなら UTF-8（宣言が実際と違うサイトがある）
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    // UTF-8 として読めない → 宣言された文字コードで読む
  }
  try {
    return new TextDecoder(label).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}
