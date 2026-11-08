(() => {
  'use strict';
  const G = globalThis.Gold750, D = globalThis.DigikalaGold;
  const formatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 6 });
  const widgets = new Map();
  let productIdentity = null, overrides = null, timer;
  const style = `
    :host { display:block; min-width:0; margin:12px 0; padding:4px; color:#183e34; font:12px/1.9 Tahoma,Arial,sans-serif; direction:rtl; }
    * { box-sizing:border-box; } section { padding:18px; border:1px solid #b8d7c9; border-inline-start:4px solid #b58a32; border-radius:16px; background:linear-gradient(135deg,#fffdf7,#edf8f2); box-shadow:0 4px 16px #183e3412; overflow-wrap:anywhere; }
    strong { display:block; font-size:13px; line-height:1.8; } .amount { margin:10px 0 12px; color:#10583e; font-size:clamp(20px,2vw,24px); font-weight:bold; line-height:1.7; font-variant-numeric:tabular-nums; }
    summary,button { cursor:pointer; } summary { padding:9px 0 0; border-top:1px solid #cfe2d7; color:#245b47; font-weight:bold; } summary:hover { color:#0d4430; } details[open] summary { margin-bottom:10px; } p { margin:6px 0; } .muted { color:#55645f; }
    .manual { color:#785600; } form { display:grid; gap:10px; margin-top:14px; } label { display:grid; gap:5px; }
    input,select,button { font:inherit; padding:9px 10px; border:1px solid #a7c2b5; border-radius:9px; min-width:0; background:white; color:#183e34; }
    input,select { width:100%; } input { direction:ltr; } .buttons { display:flex; gap:8px; flex-wrap:wrap; margin-top:2px; } button { font-weight:bold; } button:hover { background:#e6f2eb; } button[type=submit] { border-color:#185f48; background:#185f48; color:white; } button[type=submit]:hover { background:#104a37; }
    summary:focus-visible,input:focus-visible,select:focus-visible,button:focus-visible { outline:2px solid #267b59; outline-offset:3px; }
    @media (max-width:480px) { section { padding:14px; } }
    .error { color:#a22929; }`;
  function node(tag, text, className) {
    const e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (className) e.className = className;
    return e;
  }
  function render(record, data) {
    const effective = { price: data.price, weight: data.weight, purity: data.purity, ...overrides };
    const value = G.calculate(effective);
    const signature = JSON.stringify([effective, data.errors, data.conflict, Boolean(overrides)]);
    if (record.signature === signature) return;
    record.signature = signature;
    const expanded = record.shadow.querySelector('details')?.open;
    record.shadow.replaceChildren(node('style', style));
    const box = node('section');
    box.setAttribute('aria-label', 'محاسبه قیمت طلا');
    box.append(node('strong', 'قیمت هر گرم معادل طلای ۱۸ عیار'));
    if (value !== null) box.append(node('div', `${formatter.format(value)} تومان`, 'amount'));
    else {
      const missing = [];
      if (!effective.weight) missing.push('وزن');
      if (!effective.purity) missing.push('عیار');
      if (!effective.price) missing.push('قیمت');
      const conflict = data.conflict || Object.values(data.errors).includes('conflict');
      box.append(node('p', `محاسبه ممکن نیست: ${missing.join('، ')} ${conflict ? 'نامشخص یا متناقض است' : 'مشخص نیست'}`, 'error'));
    }
    if (overrides) box.append(node('p', 'محاسبه با مقادیر دستی', 'manual'));
    const details = node('details');
    details.open = expanded ?? false;
    details.append(node('summary', 'جزئیات و اصلاح مقادیر'));
    details.append(node('p', `قیمت خرید: ${effective.price ? formatter.format(effective.price) + ' تومان' : 'نامشخص'}`));
    details.append(node('p', `وزن کل طلا: ${effective.weight ? decimal.format(effective.weight) + ' گرم' : 'نامشخص'}`));
    details.append(node('p', `عیار: ${effective.purity ? decimal.format(effective.purity) : 'نامشخص'}`));
    if (data.count > 1) details.append(node('p', `تعداد در بسته: ${formatter.format(data.count)}`));
    details.append(node('p', 'قیمت خرید ÷ (وزن کل × عیار ÷ ۷۵۰)', 'muted'));
    details.append(form(effective));
    box.append(details);
    record.shadow.append(box);
  }
  function form(effective) {
    const form = node('form');
    for (const [key, title] of [['price', 'قیمت خرید (تومان)'], ['weight', 'وزن کل طلا (گرم)'], ['purity', 'عیار']]) {
      const label = node('label', title);
      const input = node(key === 'purity' ? 'select' : 'input');
      input.name = key;
      if (key === 'purity') {
        input.append(new Option('انتخاب کنید', ''));
        G.purities.forEach(p => input.append(new Option(decimal.format(p), String(p))));
      } else { input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off'; }
      input.value = effective[key] ?? '';
      label.append(input); form.append(label);
    }
    const buttons = node('div', null, 'buttons');
    const apply = node('button', 'اعمال مقادیر دستی'); apply.type = 'submit';
    const reset = node('button', 'بازنشانی'); reset.type = 'button';
    reset.addEventListener('click', () => { overrides = null; refresh(); });
    buttons.append(apply, reset);
    const error = node('p', '', 'error'); error.setAttribute('role', 'alert');
    form.append(buttons, error);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const next = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, G.number(v)]));
      if (G.calculate(next) === null) { error.textContent = 'قیمت و وزن باید عدد مثبت و عیار یکی از ۷۵۰، ۹۰۰، ۹۹۵ یا ۹۹۹ باشد.'; return; }
      overrides = next; refresh();
    });
    return form;
  }
  function attach(data, active) {
    const target = data.target;
    if (!target) return;
    active.add(target);
    let record = widgets.get(target);
    if (!record || !record.host.isConnected) {
      record?.host.remove();
      const host = node('div', null, 'gold750-host');
      const shadow = host.attachShadow({ mode: 'open' });
      record = { host, shadow };
      widgets.set(target, record);
      const anchor = data.anchor;
      if (anchor && target.contains(anchor)) {
        let position = anchor;
        while (position.parentElement !== target) position = position.parentElement;
        target.insertBefore(host, position);
      } else target.append(host);
    }
    render(record, data);
  }
  function refresh() {
    const active = new Set();
    const product = D.readProduct(document);
    if (product?.identity !== productIdentity) { overrides = null; productIdentity = product?.identity; }
    if (product) attach(product, active);
    for (const [target, record] of widgets) if (!active.has(target)) { record.host.remove(); widgets.delete(target); }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(refresh, 180); }
  const observer = new MutationObserver(records => {
    if (records.some(r => !r.target.closest?.('.gold750-host') && (r.type !== 'childList' || [...r.addedNodes, ...r.removedNodes].some(n => !n.classList?.contains('gold750-host'))))) schedule();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden', 'aria-selected', 'aria-checked', 'data-gold-price', 'data-currency'] });
  document.addEventListener('change', schedule, true);
  document.addEventListener('click', event => { if (!event.composedPath().some(n => n.classList?.contains('gold750-host'))) schedule(); }, true);
  window.addEventListener('popstate', schedule);
  refresh();
})();
