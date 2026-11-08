const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../src/gold.js');

test('750 normalization uses the entire purchase price', () => {
  assert.ok(Math.abs(G.calculate({ price: 1000000, weight: 1, purity: 999 }) - 750750.75075075) < .00001);
  assert.equal(G.calculate({ price: 15000000, weight: 2, purity: 750 }), 7500000);
  assert.equal(G.calculate({ price: 9950000, weight: 1, purity: 995 }), 7500000);
  assert.equal(G.calculate({ price: 9000000, weight: 1, purity: 900 }), 7500000);
});
test('Persian and Arabic digits and separators', () => {
  assert.equal(G.number('۱٬۰۰۰٬۰۰۰'), 1000000);
  assert.equal(G.number('٠٫٥'), .5);
  assert.ok(Number.isNaN(G.number('1abc')));
});
test('explicit Persian bullion data and multipack', () => {
  const facts = G.parseFacts('شمش طلا عیار ۹۹۹ وزن ۱ گرم بسته ۵ عددی');
  assert.equal(facts.eligible, true);
  assert.equal(facts.weight, 5);
  assert.equal(facts.purity, 999);
  assert.deepEqual(facts.errors, {});
});
test('weight unit conversions and label values', () => {
  assert.equal(G.parseFacts('شمش طلا ۹۹۵ وزن ۵۰۰ سوت').weight, .5);
  assert.equal(G.parseFacts('شمش طلا 999', 'وزن: 0.5\nعیار: 999').weight, .5);
  assert.equal(G.parseFacts('شمش طلا 999 وزن 1 میلی گرم').weight, .001);
  assert.equal(G.parseFacts('Gold bar 995 0.001 kg').weight, 1);
});
test('conflicting weight, purity and quantities are never averaged', () => {
  assert.equal(G.parseFacts('شمش طلا 999 وزن 1 گرم', 'وزن 2 گرم').weight, null);
  assert.equal(G.parseFacts('شمش طلا 999 وزن 1 گرم', 'عیار 995').purity, null);
  assert.equal(G.parseFacts('شمش طلا 999 وزن 1 گرم بسته 2 عددی', 'تعداد 3').weight, null);
});
test('selected total weight is not multiplied by the pack count', () => {
  const facts = G.parseFacts('شمش طلا پارسیس مدل 100 بسته 6 عددی', '', { totalWeightText: 'وزن طلا: ۰٫۶ گرم' });
  assert.equal(facts.weight, .6);
  assert.equal(facts.count, 6);
  assert.deepEqual(facts.errors, {});
});
test('per-bar title weight can agree with the selected package total', () => {
  const facts = G.parseFacts('شمش طلا پارسیس وزن 100 سوت بسته 6 عددی', '', { totalWeightText: 'وزن طلا: 0.6 گرم' });
  assert.equal(facts.weight, .6);
  assert.deepEqual(facts.errors, {});
});
test('contradicting selected totals or per-bar weights block calculation', () => {
  const contradictoryTitle = G.parseFacts('شمش طلا پارسیس وزن 200 سوت بسته 6 عددی', '', { totalWeightText: 'وزن طلا: 0.6 گرم' });
  assert.equal(contradictoryTitle.weight, null);
  assert.equal(contradictoryTitle.errors.weight, 'conflict');
  const contradictoryLabels = G.parseFacts('شمش طلا پارسیس بسته 6 عددی', '', { totalWeightText: 'وزن طلا: 0.6 گرم\nوزن طلا: 1.2 گرم' });
  assert.equal(contradictoryLabels.weight, null);
  assert.equal(contradictoryLabels.errors.weight, 'conflict');
});
test('24 karat does not silently imply 999 instead of 995', () => {
  assert.equal(G.parseFacts('شمش طلا عیار 24 وزن 1 گرم').purity, null);
  assert.equal(G.parseFacts('شمش طلا عیار 24 وزن 1 گرم', 'عیار 995').purity, 995);
});
test('user supplied title conventions infer purity across digit formats', () => {
  for (const [title, expected] of [
    ['شمش طلا زیوتو 24 وزن 1 گرم', 995],
    ['شمش طلا ۲۴ عیار زیوتو وزن 1 گرم', 995],
    ['شمش طلا زیوتو ٢٤ وزن 1 گرم', 995],
    ['شمش طلا ۱۸ وزن 1 گرم', 750],
    ['شمش طلا 18 وزن 1 گرم', 750],
    ['شمش طلا ١٨ وزن 1 گرم', 750],
    ['شمش طلا پارسیس وزن 1 گرم', 999],
    ['شمش طلا ایران شمش وزن 1 گرم', 995],
    ['شمش طلا ۲۴ عیار ایران‌شمش وزن 1 گرم', 995],
    ['شمش طلا ایرانشمش وزن 1 گرم', 995],
    ['شمش طلا زیوتو پلاس وزن 1 گرم', 999],
    ['شمش طلا زیوتو‌پلاس ۲۴ وزن 1 گرم', 999],
    ['شمش طلا زیوتوپلاس 24 وزن 1 گرم', 999]
  ]) {
    const facts = G.parseFacts(title);
    assert.equal(facts.purity, expected, title);
    assert.equal(facts.errors.purity, undefined, title);
  }
});
test('title conventions preserve conflicts with explicit facts', () => {
  for (const [title, specs] of [
    ['شمش طلا پارسیس وزن 1 گرم', 'عیار 995'],
    ['شمش طلا زیوتو 24 وزن 1 گرم', 'عیار 999'],
    ['شمش طلا ایران‌شمش وزن 1 گرم', 'عیار 999'],
    ['شمش طلا زیوتو پلاس 995 وزن 1 گرم', ''],
    ['انگشتر طلا ۱۸ عیار وزن 1 گرم', 'عیار 999'],
    ['سکه طلا پلاکو وزن 1 گرم', 'عیار 995'],
    ['شمش طلای محمد ۲۴ عیار وزن 1 گرم', 'عیار 999']
  ]) {
    const facts = G.parseFacts(title, specs);
    assert.equal(facts.purity, null, title);
    assert.equal(facts.errors.purity, 'conflict', title);
  }
});
test('explicit 18-karat titles take precedence over brand defaults for 24-karat lines', () => {
  for (const brand of ['ایران شمش', 'پارسیس', 'زیوتو پلاس', 'زیوتو', 'طلای محمد']) {
    const facts = G.parseFacts(`انگشتر طلا ${brand} ۱۸ عیار وزن 1 گرم`);
    assert.equal(facts.purity, 750, brand);
    assert.deepEqual(facts.errors, {}, brand);
  }
});
test('title conventions do not infer regular Zioto without 24 or match larger numbers', () => {
  for (const title of ['شمش طلا زیوتو وزن 1 گرم', 'شمش طلا مدل 180 وزن 1 گرم', 'شمش طلا زیوتو مدل 240 وزن 1 گرم', 'شمش طلا وزن 0.18 گرم']) {
    assert.equal(G.parseFacts(title).purity, null, title);
  }
});
test('all seven confirmed purity rules work with Persian title digits', () => {
  for (const [title, expected] of [
    ['شمش طلا ایران شمش ۲۴ عیار وزن ۱ گرم', 995],
    ['شمش طلا پارسیس ۲۴ عیار وزن ۱ گرم', 999],
    ['شمش طلا زیوتو پلاس ۲۴ عیار وزن ۱ گرم', 999],
    ['شمش طلا زیوتو ۲۴ عیار وزن ۱ گرم', 995],
    ['سکه طلا پلاکو وزن ۱ گرم', 750],
    ['انگشتر طلا ۱۸ غیار وزن ۱ گرم', 750],
    ['شمش طلای محمد ۲۴ عیار وزن ۱ گرم', 995]
  ]) {
    const facts = G.parseFacts(title);
    assert.equal(facts.eligible, true, title);
    assert.equal(facts.purity, expected, title);
    assert.deepEqual(facts.errors, {}, title);
  }
});
test('gold coins and jewelry are eligible alongside bars', () => {
  for (const title of [
    'سکه گرمی طلا 18 عیار ماربر مدل ماربر 1405',
    'انگشتر طلا 750 وزن 1 گرم',
    'گردنبند طلا 18 عیار وزن 1 گرم',
    'زنجیر طلا 18 عیار وزن 1 گرم',
    'دستبند طلا 18 عیار وزن 1 گرم',
    'گوشواره طلا 18 عیار وزن 1 گرم',
    'پلاک طلا 18 عیار وزن 1 گرم',
    'آویز طلا 18 عیار وزن 1 گرم',
    'سرویس طلا 18 عیار وزن 1 گرم',
    'Gold ring 750 1 g'
  ]) assert.equal(G.parseFacts(title).eligible, true, title);
});
test('exclude silver, plated gold, and products only described as golden colored', () => {
  for (const title of ['شمش نقره 999 وزن 1 گرم', 'شمش روکش طلا 999 وزن 1 گرم', 'Gold plated bar 999 1 g', 'دستبند طلایی وزن 1 گرم', 'گوشواره بدلی به رنگ طلا']) {
    assert.equal(G.parseFacts(title).eligible, false, title);
  }
});
test('central bank coins infer 900 purity from title or specifications', () => {
  for (const [title, specs] of [
    ['سکه بانک مرکزی وزن ۱ گرم', ''],
    ['سکه طلای بانک‌مرکزی وزن ۱ گرم', ''],
    ['سکه وزن ۱ گرم', 'تولیدکننده: بانک مرکزی'],
    ['ربع سکه طلا بانک مرکزی وزن ۲ گرم', 'عیار: ۹۰۰']
  ]) {
    const facts = G.parseFacts(title, specs);
    assert.equal(facts.eligible, true, title);
    assert.equal(facts.purity, 900, title);
    assert.deepEqual(facts.errors, {}, title);
  }
});

test('explicit 900 purity supports Persian, Arabic and Latin digits', () => {
  for (const purity of ['۹۰۰', '٩٠٠', '900']) {
    assert.equal(G.parseFacts(`سکه طلا عیار ${purity} وزن ۱ گرم`).purity, 900);
    assert.equal(G.parseFacts('سکه طلا وزن ۱ گرم', `عیار: ${purity}`).purity, 900);
  }
});

test('22-karat labels map to 900 in titles and specifications across digit formats', () => {
  for (const digits of ['22', '۲۲', '٢٢']) {
    for (const label of [`عیار: ${digits}`, `${digits} عیار`, `${digits} غیار`]) {
      assert.equal(G.parseFacts(`سکه طلا ${label} وزن ۱ گرم`).purity, 900, label);
      assert.equal(G.parseFacts('سکه طلا وزن ۱ گرم', label).purity, 900, label);
    }
    assert.equal(G.parseFacts(`سکه طلا ${digits} عیار وزن ۱ گرم`, 'عیار: ۹۰۰').purity, 900);
  }
});

test('22-karat labels preserve conflicts and do not match weights or model numbers', () => {
  for (const purity of [750, 995, 999]) {
    const facts = G.parseFacts('سکه طلا ۲۲ عیار وزن ۱ گرم', `عیار: ${purity}`);
    assert.equal(facts.purity, null);
    assert.equal(facts.errors.purity, 'conflict');
  }
  for (const title of ['سکه طلا مدل 22 وزن 1 گرم', 'سکه طلا وزن 0.22 گرم', 'سکه طلا 122 عیار وزن 1 گرم', 'سکه طلا عیار 220 وزن 1 گرم', 'سکه طلا 0.22 عیار وزن 1 گرم']) {
    assert.equal(G.parseFacts(title).purity, null, title);
  }
});

test('central bank rule preserves conflicts and does not apply to other coins or products', () => {
  for (const specs of ['عیار: ۷۵۰', 'عیار: ۹۹۵', 'عیار: ۹۹۹']) {
    const facts = G.parseFacts('سکه طلا بانک مرکزی وزن ۱ گرم', specs);
    assert.equal(facts.purity, null);
    assert.equal(facts.errors.purity, 'conflict');
  }
  assert.equal(G.parseFacts('سکه طلا وزن ۱ گرم').purity, null);
  assert.equal(G.parseFacts('سکه طلا ماربر ۱۸ عیار وزن ۱ گرم').purity, 750);
  assert.equal(G.parseFacts('شمش طلا بانک مرکزی وزن ۱ گرم').purity, null);
  assert.equal(G.parseFacts('سکه نقره بانک مرکزی وزن ۱ گرم').eligible, false);
  assert.equal(G.parseFacts('سکه روکش طلا بانک مرکزی وزن ۱ گرم').eligible, false);
});

test('invalid and unsupported values cannot produce a result', () => {
  for (const values of [{ price: 0, weight: 1, purity: 999 }, { price: 10, weight: -1, purity: 750 }, { price: Infinity, weight: 1, purity: 999 }, { price: 10, weight: 1, purity: 850 }]) assert.equal(G.calculate(values), null);
});

test('Tokeniko 24-karat bars infer verified 995 purity, including decorated titles', () => {
  for (const title of [
    'شمش طلا 24 عیار توکنیکو مدل GHA-0.5',
    'شمش طلا ۲۴ عیار توکنیکو مدل GON-1',
    'شمش طلا عیار: ٢٤ توکنیکو مدل GFV-5',
    'شمش طلا 24 عیـار تـوکـنیـکـو مـدل A - 1'
  ]) {
    const facts = G.parseFacts(title, '', { totalWeightText: 'وزن طلا: ۰٫۵ گرم' });
    assert.equal(facts.eligible, true, title);
    assert.equal(facts.purity, 995, title);
    assert.deepEqual(facts.errors, {}, title);
    assert.equal(G.parseFacts(title, 'عیار: ۹۹۵').purity, 995, title);
    const conflict = G.parseFacts(title, 'عیار: ۹۹۹');
    assert.equal(conflict.purity, null, title);
    assert.equal(conflict.errors.purity, 'conflict', title);
  }
});

test('Tokeniko default requires a bar, exact brand and an explicit 24-karat label', () => {
  for (const title of [
    'شمش طلا توکنیکو مدل 24',
    'شمش طلا توکنیکو مدل 240 عیار',
    'شمش طلا توکنیکو عیار 240',
    'شمش طلا توکنیکو وزن 0.24 عیار',
    'شمش طلا توکنیکو عیار 24.5',
    'شمش طلا 24 عیار توکنیکوپلاس',
    'انگشتر طلا 24 عیار توکنیکو',
    'شمش طلا توکنیکو'
  ]) assert.equal(G.parseFacts(title).purity, null, title);
  assert.equal(G.parseFacts('شمش طلا ۱۸ عیار توکنیکو').purity, 750);
  assert.equal(G.parseFacts('شمش طلا توکنیکو', 'عیار: ۹۹۹').purity, 999);
  assert.equal(G.parseFacts('شمش نقره 24 عیار توکنیکو').eligible, false);
  assert.equal(G.parseFacts('شمش روکش طلا 24 عیار توکنیکو').eligible, false);
});

test('additional Digikala brands work through their explicit purity labels', () => {
  for (const brand of ['ققنوس', 'ونوس گلد', 'ونوس', 'زربد', 'طلای آمیتیس', 'آرسس', 'سوت']) {
    const facts = G.parseFacts(`شمش طلا ۱۸ عیار ${brand} وزن ۱ گرم`);
    assert.equal(facts.eligible, true, brand);
    assert.equal(facts.purity, 750, brand);
    assert.deepEqual(facts.errors, {}, brand);
    assert.equal(G.parseFacts(`شمش طلا ${brand} وزن ۱ گرم`).purity, null, brand);
  }
  assert.equal(G.parseFacts('شمش طلا 995 عیار کسری مدل 24k').purity, 995);
  assert.equal(G.parseFacts('شمش طلا کسری مدل 24k').purity, null);
});
