const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const samples = [
  {
    name: 'Iran Shamsh six-pack', match: 'ایران_شمش', id: '21823811',
    weight: .6, count: 6, price: 26078000, purity: 995, normalized: 32761307,
    amount: '۳۲٬۷۶۱٬۳۰۷ تومان'
  },
  {
    name: 'Marbar 18-karat coin', match: 'ماربر', id: '21621552',
    weight: .03, count: 1, price: 906280, purity: 750, normalized: 30209333,
    amount: '۳۰٬۲۰۹٬۳۳۳ تومان'
  }
];

for (const sample of samples) test(`saved ${sample.name} calculates using the actual gold weight and main offer`, () => {
  const directory = path.join(__dirname, '../sample');
  const filename = fs.readdirSync(directory).find(name => name.endsWith('.html') && name.includes(sample.match));
  assert.ok(filename, `The saved ${sample.name} page must be present`);
  const html = fs.readFileSync(path.join(directory, filename), 'utf8');
  const dom = new JSDOM(html, {
    url: `https://www.digikala.com/product/dkp-${sample.id}/`,
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole()
  });
  try {
    // Saved HTML contains old widget hosts without their runtime shadow roots.
    dom.window.document.querySelectorAll('.gold750-host').forEach(host => host.remove());
    for (const name of ['gold', 'digikala', 'content']) {
      dom.window.eval(fs.readFileSync(path.join(__dirname, '../src', name + '.js'), 'utf8'));
    }
    const result = dom.window.DigikalaGold.readProduct(dom.window.document);
    assert.ok(result, 'Gold products must be eligible, including coins and jewelry');
    assert.equal(result.weight, sample.weight, 'Use the selected total gold weight');
    assert.equal(result.count, sample.count);
    assert.equal(result.errors.weight, undefined);
    assert.equal(result.price, sample.price, 'Do not read recommendation prices');
    assert.equal(result.purity, sample.purity);
    assert.equal(Math.round(dom.window.Gold750.calculate(result)), sample.normalized);
    const hosts = [...dom.window.document.querySelectorAll('.gold750-host')];
    assert.equal(hosts.length, 1, 'Only the main product receives a widget');
    const widget = hosts[0].shadowRoot;
    assert.ok(widget.textContent.includes(sample.amount));
    assert.ok(!widget.textContent.includes('محاسبه ممکن نیست'));
  } finally { dom.window.close(); }
});
