const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../itest-helper.user.js'), 'utf8');

function fixture(pages) {
  let page = 0;
  let clicks = 0;
  const fields = pages.map((answers, p) => answers.map((type, i) => {
    const field = { value: '', dispatchEvent() {}, closest() { return null; }, parentElement: null };
    const radios = type === 'radio' ? [0, 1, 2, 3].map(value => ({
      ...field, value: String(value), checked: false, click() { this.checked = true; }
    })) : [];
    return {
      field, radios, getAttribute: () => `${p}-${i}`,
      querySelectorAll: () => radios, querySelector: () => field
    };
  }));
  const next = {
    textContent: '下一页', disabled: false, getAttribute() { return null; }, closest() { return null; },
    click() { clicks++; page++; }
  };
  const context = {
    document: {
      readyState: 'loading', addEventListener() {},
      querySelectorAll: () => fields[page],
      querySelector: () => page < fields.length - 1 ? next : null
    },
    GM_addStyle() {}, GM_getValue: (_key, fallback) => fallback,
    Event: class {}, setTimeout, Date, Set
  };
  vm.runInNewContext(source.replace('    GM_addStyle(',
    '    globalThis.helpers = { fillAnswers, fillAll, goNext, waitForPageChange };\n    GM_addStyle('), context);
  return { helpers: context.helpers, fields, next, clicks: () => clicks };
}

test('the complete userscript parses and starts', () => {
  assert.doesNotThrow(() => fixture([['radio']]));
});

test('preserves text answers and accepts lower-case choice letters', () => {
  const f = fixture([['text', 'radio']]);
  const result = f.helpers.fillAnswers(['Hello, iPhone', ' b ']);
  assert.equal(result.filled, 2);
  assert.equal(f.fields[0][0].field.value, 'Hello, iPhone');
  assert.equal(f.fields[0][1].radios[1].checked, true);
});

test('advances the answer offset across real page changes', async () => {
  const f = fixture([['radio', 'radio'], ['radio', 'radio']]);
  await f.helpers.fillAll(['A', 'B', 'C', 'D'], () => {});
  assert.deepEqual(f.fields.flat().map(q => q.radios.findIndex(r => r.checked)), [0, 1, 2, 3]);
  assert.equal(f.clicks(), 1);
});

test('insufficient answers leave the current page untouched', () => {
  const f = fixture([['text', 'text']]);
  const result = f.helpers.fillAnswers(['only one']);
  assert.equal(result.filled, 0);
  assert.match(result.errors[0], /答案不足/);
  assert.equal(f.fields[0][0].field.value, '');
});

test('invalid options stop the all-pages flow before navigation', async () => {
  const f = fixture([['radio'], ['radio']]);
  await assert.rejects(f.helpers.fillAll(['Z', 'B'], () => {}), /\[Z\]/);
  assert.equal(f.clicks(), 0);
});

test('disabled or submit controls are not clicked', () => {
  const f = fixture([['radio'], ['radio']]);
  f.next.disabled = true;
  assert.equal(f.helpers.goNext(), false);
  f.next.disabled = false;
  f.next.textContent = '提交试卷';
  assert.equal(f.helpers.goNext(), false);
  assert.equal(f.clicks(), 0);
});

test('an unchanged page times out instead of being filled repeatedly', async () => {
  const f = fixture([['radio']]);
  await assert.rejects(f.helpers.waitForPageChange('0-0', 1), /翻页未完成/);
});
