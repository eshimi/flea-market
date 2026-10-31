import test from 'node:test';
import assert from 'node:assert/strict';
import { needsRender } from '../scripts/lib/render.mjs';

test('描画して読むのは Peatix のサブドメインだけ', () => {
  assert.equal(needsRender('https://ooi20261107.peatix.com/'), true);
  assert.equal(needsRender('https://peatix.com/event/1/view'), true);
  assert.equal(needsRender('https://trx.jp/schejule'), false);
  assert.equal(needsRender('https://example.org/peatix.com'), false);
  assert.equal(needsRender('not a url'), false);
});
