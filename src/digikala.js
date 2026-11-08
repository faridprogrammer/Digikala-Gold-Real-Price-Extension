(function (root) {
  'use strict';
  const G = root.Gold750;
  const priceSelector = '[data-testid="price-final"], [data-testid="final-price"], [data-gold-price], [itemprop="price"]';
  function visible(element) {
    if (!element || element.closest('[hidden], [aria-hidden="true"], del, s, .gold750-host')) return false;
    const view = element.ownerDocument.defaultView;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      const style = view?.getComputedStyle(node);
      if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    }
    return true;
  }
  function readPrice(scope) {
    const candidates = [...scope.querySelectorAll(priceSelector)].filter(visible);
    const parsed = candidates.map(element => {
      const text = G.normalize(element.textContent);
      const explicit = element.getAttribute('data-gold-price');
      const amount = explicit ?? text.replace(/(?:تومان|ریال|IRR|IRT|تومن)/gi, '').trim();
      const unit = element.getAttribute('data-currency') || (text.match(/تومان|تومن|ریال|IRR|IRT/i)?.[0]);
      // Digikala's price-final marker represents toman amounts even when currency is an SVG.
      const knownToman = element.matches('[data-testid="price-final"], [data-testid="final-price"]');
      if (!unit && !knownToman) return null;
      const value = G.number(amount) / (/^(ریال|IRR)$/i.test(unit) ? 10 : 1);
      return value > 0 && Number.isFinite(value) ? { value, element } : null;
    }).filter(Boolean);
    const values = [...new Set(parsed.map(p => p.value))];
    return { price: values.length === 1 ? values[0] : null, anchor: parsed[0]?.element ?? candidates[0], conflict: values.length > 1 };
  }
  function specs(document) {
    const rows = document.querySelectorAll('[data-gold-spec], [data-testid="product-specification"], [data-testid="product-specifications"] tr, [data-testid="product-specifications"] li, #specification tr, #specification li, [id*="specification"] [class*="Specification"], [class*="Specification"] li, [class*="Specification"] tr');
    const texts = [...rows].filter(visible).map(e => e.textContent);
    // Also support label/value specifications without depending on generated CSS hashes.
    for (const label of document.querySelectorAll('p, dt, th, span')) {
      if (!/^(?:وزن(?:\s*\(گرم\))?|[عغ]یار|تعداد)\s*[:：]?$/.test(G.normalize(label.textContent)) || !visible(label)) continue;
      const row = label.tagName === 'DT' ? null : label.parentElement;
      if (label.tagName === 'DT') texts.push(`${label.textContent}: ${label.nextElementSibling?.textContent ?? ''}`);
      else if (row && row.textContent.length < 180) texts.push(row.textContent);
    }
    return texts.join('\n');
  }
  function selectedGoldWeight(document) {
    // Current product pages put the selected SKU's total gold weight in the
    // variant header, e.g. «وزن طلا: 0.6 گرم», outside the specification table.
    const labels = [...document.querySelectorAll('span, p, div')].filter(element => {
      const text = G.normalize(element.textContent);
      return text.length < 120 && /^وزن\s+(?:کل\s+)?طلا\s*[:：]/.test(text) && visible(element)
        && !element.closest('a[href*="/product/"], [data-testid="product-card"]');
    });
    return labels.filter(element => !labels.some(other => other !== element && element.contains(other)))
      .map(element => element.textContent).join('\n');
  }
  function readProduct(document) {
    if (!/^\/product\//.test(document.location?.pathname ?? '')) return null;
    const titleNode = document.querySelector('h1');
    if (!titleNode) return null;
    const title = titleNode.textContent;
    const facts = G.parseFacts(title, specs(document), { totalWeightText: selectedGoldWeight(document) });
    if (!facts.eligible) return null;
    // Prefer the main purchase panel so other sellers and recommendations cannot supply its price.
    const panel = document.querySelector('[data-testid="buy-box"], [data-testid="product-buy-box"], [data-gold-buy-box], [class*="ProductBuyBox"], [class*="BuyBox"]');
    const scope = panel || document.querySelector('main') || document.body;
    const price = readPrice(scope);
    const seller = scope.querySelector('[data-testid="seller-name"], [data-gold-seller], [class*="seller-name"], [class*="SellerInfo"]')?.textContent ?? '';
    const selectionScope = document.querySelector('main') || document.body;
    const selected = [...selectionScope.querySelectorAll('[aria-checked="true"], [aria-selected="true"], input:checked')].map(e => `${e.textContent}:${e.value ?? ''}`).join('|');
    return { ...facts, ...price, title, target: panel || price.anchor?.parentElement || titleNode.parentElement,
      identity: `${document.location.href}|${G.normalize(title)}|${G.normalize(seller)}|${selected}|${facts.weight}|${facts.purity}|${price.price}` };
  }
  root.DigikalaGold = { readPrice, readProduct };
  if (typeof module !== 'undefined') module.exports = root.DigikalaGold;
})(globalThis);
