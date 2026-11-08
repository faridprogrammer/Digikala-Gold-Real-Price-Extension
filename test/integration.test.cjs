const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const scripts = ['gold', 'digikala', 'content'].map(name => fs.readFileSync(`${__dirname}/../src/${name}.js`, 'utf8'));
function page(html, path = '/product/dkp-123/test/') {
  const dom = new JSDOM(html, { url: `https://www.digikala.com${path}`, runScripts: 'outside-only', pretendToBeVisual: true });
  scripts.forEach(script => dom.window.eval(script));
  return dom;
}
function widget(dom, selector = '[data-gold-buy-box]') { return dom.window.document.querySelector(`${selector} .gold750-host`)?.shadowRoot; }
const product = `<main><h1>شمش طلا 999 وزن 1 گرم</h1><div data-gold-buy-box><span data-gold-seller>فروشنده اول</span><span data-testid="price-final">۱٬۰۰۰٬۰۰۰</span></div></main>`;
const settle = () => new Promise(resolve => setTimeout(resolve, 260));
const selectedWeightFixture = fs.readFileSync(`${__dirname}/fixtures/selected-total-weight.html`, 'utf8');

test('central bank coins display a 900-purity calculation', () => {
  const dom = page(product.replace('شمش طلا 999 وزن 1 گرم', 'سکه بانک مرکزی وزن ۱ گرم'));
  try {
    const shadow = widget(dom);
    assert.match(shadow.textContent, /۸۳۳٬۳۳۳ تومان/);
    assert.equal(shadow.querySelector('[name=purity]').value, '900');
  } finally { dom.window.close(); }
});

test('22-karat labels in titles or specifications display a 900-purity calculation', () => {
  for (const html of [
    product.replace('شمش طلا 999 وزن 1 گرم', 'سکه طلا ۲۲ عیار وزن ۱ گرم'),
    product.replace('999 وزن 1 گرم', 'وزن 1 گرم').replace('</main>', '<div data-gold-spec>عیار: ٢٢</div></main>')
  ]) {
    const dom = page(html);
    try {
      assert.match(widget(dom).textContent, /۸۳۳٬۳۳۳ تومان/);
      assert.equal(widget(dom).querySelector('[name=purity]').value, '900');
    } finally { dom.window.close(); }
  }
});

test('900 purity can be selected and applied manually', () => {
  const dom = page(product.replace('شمش طلا 999 وزن 1 گرم', 'سکه طلا وزن ۱ گرم'));
  try {
    const shadow = widget(dom);
    assert.match(shadow.textContent, /محاسبه ممکن نیست/);
    const form = shadow.querySelector('form');
    form.elements.purity.value = '900';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.match(shadow.textContent, /۸۳۳٬۳۳۳ تومان/);
    assert.match(shadow.textContent, /محاسبه با مقادیر دستی/);
  } finally { dom.window.close(); }
});

test('central bank identification in specifications reaches the product calculation', () => {
  const html = product.replace('شمش طلا 999 وزن 1 گرم', 'سکه وزن ۱ گرم')
    .replace('</main>', '<div data-gold-spec>تولیدکننده: بانک مرکزی</div></main>');
  const dom = page(html);
  try {
    assert.match(widget(dom).textContent, /۸۳۳٬۳۳۳ تومان/);
    assert.equal(widget(dom).querySelector('[name=purity]').value, '900');
  } finally { dom.window.close(); }
});

test('selected total gold weight is read outside specifications without multiplying the pack again', () => {
  const dom = page(selectedWeightFixture);
  try {
    const result = dom.window.DigikalaGold.readProduct(dom.window.document);
    assert.equal(result.weight, .6);
    assert.equal(result.count, 6);
    assert.equal(result.errors.weight, undefined);
    assert.equal(widget(dom).querySelector('[name=weight]').value, '0.6');
  } finally { dom.window.close(); }
});
test('selected total weight changes recalculate and clear manual overrides', async () => {
  const dom = page(selectedWeightFixture.replace('ایران‌شمش', 'پارسیس'));
  try {
    const shadow = widget(dom);
    const expected = weight => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(26078000 * 750 / (weight * 999));
    assert.ok(shadow.textContent.includes(expected(.6) + ' تومان'));
    const form = shadow.querySelector('form');
    form.elements.weight.value = '2';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    assert.match(shadow.textContent, /محاسبه با مقادیر دستی/);
    dom.window.document.querySelector('.text-h5-180').textContent = 'وزن طلا: 1.2 گرم';
    await settle();
    assert.equal(dom.window.DigikalaGold.readProduct(dom.window.document).weight, 1.2);
    assert.doesNotMatch(shadow.textContent, /محاسبه با مقادیر دستی/);
    assert.ok(shadow.textContent.includes(expected(1.2) + ' تومان'));
  } finally { dom.window.close(); }
});
test('inject correct product result, details, manual override and reset', async () => {
  const dom = page(product);
  try {
    let shadow = widget(dom);
    assert.match(shadow.textContent, /۷۵۰٬۷۵۱ تومان/);
    const form = shadow.querySelector('form');
    form.elements.price.value = '۲۰۰۰۰۰۰';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    assert.match(shadow.textContent, /۱٬۵۰۱٬۵۰۲ تومان/);
    assert.match(shadow.textContent, /محاسبه با مقادیر دستی/);
    shadow.querySelector('button[type="button"]').click();
    assert.match(shadow.textContent, /۷۵۰٬۷۵۱ تومان/);
    assert.doesNotMatch(shadow.textContent, /محاسبه با مقادیر دستی/);
    await settle();
    assert.equal(dom.window.document.querySelectorAll('.gold750-host').length, 1);
  } finally { dom.window.close(); }
});
test('seller changes clear manual values and price mutations recalculate', async () => {
  const dom = page(product);
  try {
    const form = widget(dom).querySelector('form');
    form.elements.weight.value = '2';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    dom.window.document.querySelector('[data-gold-seller]').textContent = 'فروشنده دوم';
    dom.window.document.querySelector('[data-testid="price-final"]').textContent = '۲٬۰۰۰٬۰۰۰';
    await settle();
    assert.match(widget(dom).textContent, /۱٬۵۰۱٬۵۰۲ تومان/);
    assert.doesNotMatch(widget(dom).textContent, /محاسبه با مقادیر دستی/);
  } finally { dom.window.close(); }
});
test('search and category pages never receive calculations, including dynamic cards', async () => {
  const dom = page(`<main>
    <a data-testid="product-card" href="/product/dkp-1/"><h3>شمش طلا 995 وزن 1 گرم</h3><span data-testid="price-final">9950000</span></a>
    <a data-testid="product-card" href="/product/dkp-2/"><h3>شمش طلا</h3><span data-testid="price-final">1000000</span></a>
    <a data-testid="product-card" href="/product/dkp-3/"><h3>شمش نقره 999 وزن 1 گرم</h3><span data-testid="price-final">1000000</span></a>
  </main>`, '/search/');
  try {
    assert.equal(dom.window.document.querySelectorAll('.gold750-host').length, 0);
    const card = dom.window.document.querySelector('[data-testid="product-card"]').cloneNode(true);
    dom.window.document.querySelector('main').append(card);
    await settle();
    assert.equal(dom.window.document.querySelectorAll('.gold750-host').length, 0);
    dom.window.history.pushState({}, '', '/product-list/category-gold/');
    dom.window.document.querySelector('main').insertAdjacentHTML('afterbegin', '<h1>شمش طلا 999 وزن 1 گرم</h1>');
    await settle();
    assert.equal(dom.window.document.querySelectorAll('.gold750-host').length, 0);
  } finally { dom.window.close(); }
});
test('conflicting offers and hidden prices do not silently select the cheapest seller', () => {
  const dom = page(product.replace('</div>', '<span data-testid="price-final">2000000</span><span hidden data-testid="price-final">3000000</span></div>'));
  try {
    assert.equal(dom.window.DigikalaGold.readProduct(dom.window.document).price, null);
    assert.match(widget(dom).textContent, /متناقض/);
  } finally { dom.window.close(); }
});
test('explicit rial amounts are converted to toman and struck out prices ignored', () => {
  const dom = page(product.replace('<span data-testid="price-final">۱٬۰۰۰٬۰۰۰</span>', '<del><span data-testid="price-final">2000000</span></del><span data-gold-price="10000000" data-currency="IRR"></span>'));
  try { assert.match(widget(dom).textContent, /۷۵۰٬۷۵۱ تومان/); }
  finally { dom.window.close(); }
});
test('specification labels supply missing facts and conflicting data blocks result', () => {
  const dom = page(product.replace('999 وزن 1 گرم', '').replace('</main>', '<dl><dt>وزن</dt><dd>1 گرم</dd><dt>عیار</dt><dd>995</dd></dl></main>'));
  try { assert.equal(dom.window.DigikalaGold.readProduct(dom.window.document).purity, 995); }
  finally { dom.window.close(); }
});
test('variant controls outside buy box clear overrides even when price is unchanged', async () => {
  const dom = page(product.replace('<h1>', '<button aria-checked="true">مدل اول</button><button aria-checked="false">مدل دوم</button><h1>'));
  try {
    const form = widget(dom).querySelector('form');
    form.elements.weight.value = '2';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    assert.match(widget(dom).textContent, /محاسبه با مقادیر دستی/);
    const buttons = dom.window.document.querySelectorAll('main > button');
    buttons[0].setAttribute('aria-checked', 'false');
    buttons[1].setAttribute('aria-checked', 'true');
    await settle();
    assert.doesNotMatch(widget(dom).textContent, /محاسبه با مقادیر دستی/);
    assert.match(widget(dom).textContent, /۷۵۰٬۷۵۱ تومان/);
  } finally { dom.window.close(); }
});
test('missing facts can be manually supplied; invalid edits do not calculate', () => {
  const dom = page(product.replace('999 وزن 1 گرم', ''));
  try {
    const shadow = widget(dom);
    assert.match(shadow.textContent, /محاسبه ممکن نیست/);
    const form = shadow.querySelector('form');
    form.elements.weight.value = '-1';
    form.elements.purity.value = '995';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    assert.match(shadow.querySelector('[role="alert"]').textContent, /عدد مثبت/);
    form.elements.weight.value = '1';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    assert.match(shadow.textContent, /۷۵۳٬۷۶۹ تومان/);
    assert.match(shadow.textContent, /محاسبه با مقادیر دستی/);
    shadow.querySelector('button[type="button"]').click();
    assert.match(shadow.textContent, /محاسبه ممکن نیست/);
  } finally { dom.window.close(); }
});
test('client-side navigation removes stale product widgets and overrides', async () => {
  const dom = page(product);
  try {
    dom.window.history.pushState({}, '', '/product/dkp-456/');
    dom.window.document.querySelector('h1').textContent = 'گوشی موبایل';
    await settle();
    assert.equal(dom.window.document.querySelector('.gold750-host'), null);
  } finally { dom.window.close(); }
});
test('brand and title purity conventions work on product pages', () => {
  for (const [title, purity] of [
    ['شمش طلا زیوتو ۲۴ وزن 1 گرم', 995],
    ['شمش طلا ایران‌شمش ۲۴ وزن 1 گرم', 995],
    ['شمش طلا ۱۸ وزن 1 گرم', 750],
    ['شمش طلا پارسیس وزن 1 گرم', 999],
    ['شمش طلا زیوتو پلاس ۲۴ وزن 1 گرم', 999]
  ]) {
    const dom = page(product.replace('شمش طلا 999 وزن 1 گرم', title));
    try {
      assert.equal(dom.window.DigikalaGold.readProduct(dom.window.document).purity, purity);
      const amount = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(1000000 * 750 / purity);
      assert.ok(widget(dom).textContent.includes(`${amount} تومان`));
    } finally { dom.window.close(); }
  }
});
test('gold jewelry has a product-page calculation and manual controls', () => {
  const dom = page(product.replace('شمش طلا 999 وزن 1 گرم', 'انگشتر طلا ۱۸ غیار وزن 2 گرم'));
  try {
    assert.match(widget(dom).textContent, /۵۰۰٬۰۰۰ تومان/);
    assert.equal(widget(dom).querySelector('[name=weight]').value, '2');
    assert.equal(widget(dom).querySelector('[name=purity]').value, '750');
  } finally { dom.window.close(); }
});
test('product recommendations get no widgets and navigation to search removes the product widget', async () => {
  const card = '<a data-testid="product-card" href="/product/dkp-999/"><h3>شمش طلا پارسیس وزن 1 گرم</h3><span data-testid="price-final">1000000</span></a>';
  const dom = page(product.replace('</main>', `${card}</main>`));
  try {
    assert.equal(dom.window.document.querySelectorAll('.gold750-host').length, 1);
    assert.equal(dom.window.document.querySelector('[data-testid="product-card"] .gold750-host'), null);
    dom.window.history.pushState({}, '', '/search/');
    dom.window.document.querySelector('[data-gold-buy-box]').remove();
    await settle();
    assert.equal(dom.window.document.querySelectorAll('.gold750-host').length, 0);
    dom.window.history.pushState({}, '', '/product/dkp-123/test/');
    dom.window.document.querySelector('main').outerHTML = product;
    await settle();
    assert.match(widget(dom).textContent, /۷۵۰٬۷۵۱ تومان/);
  } finally { dom.window.close(); }
});
