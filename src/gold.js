(function (root) {
  'use strict';
  const purities = [750, 900, 995, 999];
  function normalize(value) {
    return String(value ?? '').replace(/[۰-۹]/g, c => c.charCodeAt(0) - 1776)
      .replace(/[٠-٩]/g, c => c.charCodeAt(0) - 1632)
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ـ/g, '').replace(/٫/g, '.')
      .replace(/[٬,]/g, '').replace(/[\u200c\u200e\u200f]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function number(value) {
    const text = normalize(value);
    return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text) ? Number(text) : NaN;
  }
  function unique(values) {
    return [...new Set(values.map(v => Number(v.toFixed(9))))];
  }
  function gramWeights(text) {
    const weights = [];
    for (const match of normalize(text).matchAll(/(\d+(?:\.\d+)?)\s*(کیلوگرم|میلی\s*گرم|گرم|سوت|kg\b|mg\b|g\b)/gi)) {
      const unit = match[2].toLowerCase().replace(/\s/g, '');
      weights.push(Number(match[1]) * (/^(کیلوگرم|kg)$/.test(unit) ? 1000 : /^(میلیگرم|سوت|mg)$/.test(unit) ? .001 : 1));
    }
    return weights;
  }
  function parseFacts(title, specifications = '', { totalWeightText = '' } = {}) {
    const name = normalize(title);
    const text = `${name} ${normalize(specifications)}`;
    const centralBankCoin = /(?:^|[^\p{L}])سکه(?=$|[^\p{L}])/u.test(name)
      && /بانک\s*مرکزی/.test(text);
    const eligible = (centralBankCoin || /(?:^|[^\p{L}])طلای?(?=$|[^\p{L}])|\bgold\b/iu.test(name))
      && !/(?:نقره|روکش|آبکاری|بدلی|silver|plated)/i.test(name);
    const weights = gramWeights(text);
    // Specification labels often put the unit before the value: «وزن: 1».
    for (const match of normalize(specifications).matchAll(/وزن(?:\s*\(گرم\))?\s*[:：]?\s*(\d+(?:\.\d+)?)(?![\d.])/g)) {
      const after = normalize(specifications).slice(match.index + match[0].length);
      if (!/^\s*(?:کیلوگرم|میلی\s*گرم|سوت|kg|mg)/i.test(after)) weights.push(Number(match[1]));
    }
    const purityValues = [];
    for (const match of text.matchAll(/(?:[عغ]یار\s*[:：]?\s*(999|995|900|750|18|22)(?![\d.])|\b(999|995|900|750)\b|(?<![\d.])(18|22)\s*[عغ]یار)/g)) {
      const value = Number(match[1] || match[2] || match[3]);
      purityValues.push(value === 18 ? 750 : value === 22 ? 900 : value);
    }
    if (centralBankCoin) purityValues.push(900);
    // User-supplied brand defaults describe the 24-karat lines. Explicit
    // 18-karat titles use 750; contradictory numeric facts still conflict.
    const titleIs18K = /(?<![\d.])18(?![\d.])/.test(name);
    if (titleIs18K) purityValues.push(750);
    if (/پلاکو/.test(name)) purityValues.push(750);
    if (!titleIs18K) {
      if (/پارسیس/.test(name)) purityValues.push(999);
      if (/ایران\s*شمش/.test(name)) purityValues.push(995);
      if (/طلای?\s*محمد/.test(name)) purityValues.push(995);
      if (/زیوتو\s*پلاس/.test(name)) purityValues.push(999);
      else if (/زیوتو/.test(name) && /(?<![\d.])24(?![\d.])/.test(name)) purityValues.push(995);
      // Digikala dkp-18567127 and Tokeniko's catalog confirm 995 for its
      // 24-karat gold bars. Do not extend this default to other product lines.
      if (/(?:^|[^\p{L}])توکنیکو(?=$|[^\p{L}])/u.test(name)
        && /(?:^|[^\p{L}])شمش(?=$|[^\p{L}])/u.test(name)
        && /(?<![\d.])24\s*[عغ]یار|[عغ]یار\s*[:：]?\s*24(?![\d.])/.test(name)) purityValues.push(995);
    }
    const counts = [];
    for (const match of text.matchAll(/(?:بسته(?:\s*بندی)?\s*(\d+)\s*عدد(?:ی)?|(?:تعداد)\s*[:：]?\s*(\d+))/g)) counts.push(Number(match[1] || match[2]));
    const w = unique(weights), p = unique(purityValues), c = unique(counts);
    const errors = {};
    const totals = unique(gramWeights(totalWeightText));
    let weight;
    if (totalWeightText) {
      // The selected «وزن طلا» is the gold in the offered SKU/package. A pack's
      // count must not multiply this total; title/spec values may be per bar.
      weight = totals[0];
      if (totals.length !== 1 || weight <= 0) errors.weight = totals.length > 1 ? 'conflict' : 'missing';
      else if (w.some(value => value <= 0 || (Math.abs(value - weight) > 1e-9 && Math.abs(value * (c[0] ?? 1) - weight) > 1e-9))) errors.weight = 'conflict';
    } else {
      if (w.length !== 1 || w[0] <= 0) errors.weight = w.length > 1 ? 'conflict' : 'missing';
      weight = w[0] * (c[0] ?? 1);
    }
    if (p.length !== 1) errors.purity = p.length > 1 ? 'conflict' : 'missing';
    if (c.length > 1 || (c.length && (!Number.isInteger(c[0]) || c[0] <= 0))) errors.weight = 'conflict';
    return { eligible, weight: errors.weight ? null : weight, purity: errors.purity ? null : p[0], count: c[0] ?? 1, errors };
  }
  function calculate({ price, weight, purity }) {
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(weight) || weight <= 0 || !purities.includes(purity)) return null;
    return price * 750 / (weight * purity);
  }
  const api = { normalize, number, parseFacts, calculate, purities };
  root.Gold750 = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
