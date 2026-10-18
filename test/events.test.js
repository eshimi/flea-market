import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expand, validateRecurrence } from '../scripts/lib/recurrence.mjs';
import { buildOccurrences, validateOccurrences, validateSeries } from '../scripts/lib/events.mjs';

test('毎月第1・第3日曜', () => {
  const r = { type: 'monthly-nth', byday: [{ n: 1, wd: 0 }, { n: 3, wd: 0 }], text: '毎月第1・第3日曜' };
  assert.deepEqual(expand(r, '2026-10-01', '2026-11-30'), ['2026-10-04', '2026-10-18', '2026-11-01', '2026-11-15']);
});

test('毎月28日・31日（ない月は飛ばす）・休みの月', () => {
  const r = { type: 'monthly-day', days: [28, 31], exceptMonths: [12], text: '…' };
  assert.deepEqual(expand(r, '2026-10-01', '2027-01-31'), ['2026-10-28', '2026-10-31', '2026-11-28', '2027-01-28', '2027-01-31']);
});

test('毎週・期間の制限・日付の指定', () => {
  assert.deepEqual(expand({ type: 'weekly', weekdays: [6], text: '…', until: '2026-10-31' }, '2026-10-17', '2026-12-31'), ['2026-10-17', '2026-10-24', '2026-10-31']);
  assert.deepEqual(expand({ type: 'dates', dates: ['2026-12-16', '2026-12-15', '2027-01-15'], text: '…' }, '2026-10-17', '2026-12-31'), ['2026-12-15', '2026-12-16']);
});

test('きまりの検証', () => {
  assert.deepEqual(validateRecurrence({ type: 'weekly', weekdays: [0], text: '毎週日曜' }), []);
  assert.ok(validateRecurrence({ type: 'monthly-nth', byday: [{ n: 6, wd: 0 }], text: 'x' }).length);
  assert.ok(validateRecurrence({ type: 'weekly', weekdays: [0] }).length, 'text がないと不可');
});

const series = (over = {}) => ({
  id: 'test-market',
  name: 'テスト市',
  kinds: ['kotto'],
  organizer: { name: '主催', url: 'https://example.org/' },
  venue: { name: '会場', pref: '13', city: '千代田区', cityCode: '13101' },
  recurrence: { type: 'monthly-nth', byday: [{ n: 3, wd: 6 }], text: '毎月第3土曜' },
  sources: [{ url: 'https://example.org/', type: 'organizer', checkedAt: '2026-10-15' }],
  ...over,
});

test('シリーズの検証', () => {
  assert.deepEqual(validateSeries([series()]), []);
  assert.ok(validateSeries([series(), series()]).some((e) => e.includes('重複')));
  assert.ok(validateSeries([series({ kinds: ['x'] })]).length);
  assert.ok(validateSeries([series({ sources: [] })]).some((e) => e.includes('出典')));
  assert.ok(validateSeries([series({ venue: { name: 'a', pref: '13', city: 'x', cityCode: '14100' } })]).length);
});

test('開催回：算出・公式で確認・中止・延期', () => {
  const s = series();
  const ov = [
    { series: s.id, date: '2026-11-21', status: 'cancelled', reason: '会場の工事のため', checkedAt: '2026-10-16', source: 'https://example.org/n' },
    { series: s.id, date: '2026-12-19', status: 'postponed', movedTo: '2026-12-26', checkedAt: '2026-10-16', source: 'https://example.org/n' },
    { series: s.id, date: '2026-12-26', status: 'confirmed', checkedAt: '2026-10-16', source: 'https://example.org/n' },
  ];
  assert.deepEqual(validateOccurrences(ov, new Set([s.id])), []);
  const list = buildOccurrences([s], ov, '2026-10-17', 75);
  assert.deepEqual(list.map((o) => [o.date, o.status]), [
    ['2026-10-17', 'scheduled'], ['2026-11-21', 'cancelled'], ['2026-12-19', 'postponed'], ['2026-12-26', 'confirmed'],
  ]);
  assert.equal(list[1].note, '会場の工事のため');
  assert.match(list[2].note, /2026-12-26/);
});

test('最終確認が古いものは要確認', () => {
  const s = series({ sources: [{ url: 'https://example.org/', type: 'organizer', checkedAt: '2026-09-01' }] });
  const [o] = buildOccurrences([s], [], '2026-10-17', 1);
  assert.equal(o.status, 'unknown');
  assert.match(o.note, /14日/);
});

test('日付を列挙したきまりは、公式で確認（古くなれば要確認）', () => {
  const s = series({ recurrence: { type: 'dates', dates: ['2026-10-31'], text: '日程は公式で発表' } });
  assert.equal(buildOccurrences([s], [], '2026-10-17', 30)[0].status, 'confirmed');
  const old = { ...s, sources: [{ ...s.sources[0], checkedAt: '2026-09-01' }] };
  assert.equal(buildOccurrences([old], [], '2026-10-17', 30)[0].status, 'unknown');
});
