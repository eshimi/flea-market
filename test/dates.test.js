import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, holidays, isDayOff, label, nthWeekday, parseYmd, todayJst, upcomingWeekend } from '../scripts/lib/dates.mjs';

test('存在しない日付は受け付けない', () => {
  assert.throws(() => parseYmd('2026-02-30'));
  assert.throws(() => parseYmd('2026/10/17'));
});

test('日本時間の今日', () => {
  assert.equal(todayJst(new Date('2026-10-17T14:59:00Z')), '2026-10-17');
  assert.equal(todayJst(new Date('2026-10-17T15:00:00Z')), '2026-10-18');
});

test('第n曜日・最終曜日', () => {
  assert.equal(nthWeekday(2026, 10, 3, 6), '2026-10-17');
  assert.equal(nthWeekday(2026, 10, 5, 6), '2026-10-31');
  assert.equal(nthWeekday(2026, 2, 5, 0), null);
  assert.equal(nthWeekday(2026, 10, -1, 0), '2026-10-25');
});

test('2026年の祝日（振替休日・国民の休日を含む）', () => {
  const h = [...holidays(2026).keys()].sort();
  assert.deepEqual(h, [
    '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20', '2026-04-29',
    '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-07-20', '2026-08-11',
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-12', '2026-11-03', '2026-11-23',
  ]);
});

test('今週末：土日と、つながる祝日', () => {
  assert.deepEqual(upcomingWeekend('2026-10-14'), ['2026-10-17', '2026-10-18']);
  assert.deepEqual(upcomingWeekend('2026-10-18'), ['2026-10-18']);
  assert.deepEqual(upcomingWeekend('2026-10-08'), ['2026-10-10', '2026-10-11', '2026-10-12']);
  assert.ok(isDayOff('2026-11-03'));
});

test('表示用の日付', () => {
  assert.equal(label('2026-10-17'), '10月17日（土）');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
