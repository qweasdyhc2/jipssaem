// 학습지 생성기 공통 도우미: 옵션 읽기 → 생성 → A4 페이지로 그리기 → 인쇄
const WS = (() => {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chunk = (a, n) => { const r = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; };
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  // 세로 분수
  const frac = (n, d) => `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
  // 같은 문제가 연달아 나오지 않게 뽑기 (key가 같으면 다시 뽑음)
  function uniq(make, n, key = (x) => JSON.stringify(x), tries = 50) {
    const seen = new Set(), out = [];
    while (out.length < n) {
      let x, k, t = 0;
      do { x = make(); k = key(x); } while (seen.has(k) && ++t < tries);
      seen.add(k); out.push(x);
    }
    return out;
  }

  // 세로셈 한 문제 (ans가 null이면 빈칸)
  const vcalc = (a, op, b, ans) => `<div class="vcalc"><div>${a}</div><div><span class="op">${op}</span>${b}</div><div class="ln">${ans == null ? '' : `<span class="ansv">${ans}</span>`}</div></div>`;
  // 문제 칸 배치: 열·행 수를 주면 쪽을 꽉 채우는 격자
  const grid = (items, cols, cls = 'qgrid', flow = 'row') => `<div class="${cls}" style="height:100%;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${Math.ceil(items.length / cols)},1fr);grid-auto-flow:${flow}">${items.join('')}</div>`;

  // 따라쓰기 칸 한 줄: chars 배열, size(mm), kind: 'b'(검정) 'g'(흐린 글씨) '' (빈칸) 또는 칸별 배열, guide: 십자 보조선
  const cells = (chars, n, size, kind, guide, font, color = '#8aa') => {
    let s = `<div class="trow">`;
    for (let i = 0; i < n; i++) {
      const ch = chars[i] == null ? '' : chars[i], k = Array.isArray(kind) ? kind[i] : kind;
      s += `<div class="cell${guide ? ' x' : ''}${k === 'g' ? ' g' : ''}" style="width:${size}mm;height:${size}mm;font-size:${(size * .74).toFixed(1)}mm;border-color:${color};${font ? `font-family:'${font}',serif;` : ''}"><span>${k ? esc(ch) : ''}</span></div>`;
    }
    return s + '</div>';
  };

  // 블록(줄 묶음) 배열을 쪽마다 나눔. hOf(block) = 높이(mm), H = 쪽 본문 높이, gap = 블록 사이
  function pack(blocks, hOf, H = 246, gap = 2.5) {
    const pages = [[]]; let used = 0;
    for (const b of blocks) {
      const h = hOf(b);
      if (pages[pages.length - 1].length && used + gap + h > H) { pages.push([]); used = 0; }
      used += (pages[pages.length - 1].length ? gap : 0) + h;
      pages[pages.length - 1].push(b);
    }
    return pages;
  }

  let cfg, form, sheets;
  const KEY = 'ws:' + location.pathname;

  function opts() {
    const o = {};
    form.querySelectorAll('[name]').forEach((el) => {
      const k = el.name;
      if (el.type === 'checkbox' && el.dataset.multi !== undefined) { (o[k] = o[k] || []); if (el.checked) o[k].push(el.value); }
      else if (el.type === 'checkbox') o[k] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[k] = el.value; }
      else o[k] = (el.type === 'number' || el.dataset.num !== undefined) ? Number(el.value) : el.value;
    });
    return o;
  }
  function save() {
    const v = {};
    form.querySelectorAll('[name]').forEach((el) => { v[el.name + (el.type === 'checkbox' || el.type === 'radio' ? '=' + el.value : '')] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value; });
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 동작 */ }
  }
  function load() {
    let v;
    try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { v = null; }
    if (!v) return;
    form.querySelectorAll('[name]').forEach((el) => {
      const k = el.name + (el.type === 'checkbox' || el.type === 'radio' ? '=' + el.value : '');
      if (!(k in v)) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = v[k]; else el.value = v[k];
    });
  }

  function page(title, body, o, extra = {}) {
    const who = o.who === false || extra.noWho ? '' :
      `<div class="who"><span>이름 <u></u></span><span>날짜 <u class="s"></u>월 <u class="s"></u>일</span>${extra.count ? `<span>맞은 개수 <u class="s"></u>/ ${extra.count}</span>` : ''}</div>`;
    return `<section class="page${extra.ans ? ' ans' : ''}"><div class="ph"><div class="pt">${extra.ans ? '<b class="tag">정답</b>' : ''}${esc(title).replace(/\s*\((.*)\)$/, ' <small>$1</small>')}</div>${extra.ans ? '' : who}</div>`
      + `<div class="pb">${body}</div><div class="pf">${o.site === false ? '&nbsp;' : `${esc((document.querySelector('.logo') || {}).textContent || '')} · <b>jipssaem.com</b> · 무료 인쇄용 학습지`}</div></section>`;
  }

  // 옵션을 주소에 담기 (글자 입력칸은 아이 이름·문장이 들어가므로 절대 넣지 않음)
  function linkFromOpts() {
    const p = new URLSearchParams(), multi = {};
    form.querySelectorAll('[name]').forEach((el) => {
      if (el.tagName === 'TEXTAREA' || el.type === 'text') return;
      if (el.type === 'checkbox' && el.dataset.multi !== undefined) { multi[el.name] = multi[el.name] || []; if (el.checked) multi[el.name].push(el.value); }
      else if (el.type === 'checkbox') p.set(el.name, el.checked ? '1' : '0');
      else if (el.type === 'radio') { if (el.checked) p.set(el.name, el.value); }
      else p.set(el.name, el.value);
    });
    Object.keys(multi).forEach((k) => p.set(k, multi[k].join(',')));
    return location.origin + location.pathname + '?' + p.toString();
  }
  function optsFromLink() {
    const p = new URLSearchParams(location.search);
    if (![...p.keys()].length) return;
    form.querySelectorAll('[name]').forEach((el) => {
      if (el.tagName === 'TEXTAREA' || el.type === 'text' || !p.has(el.name)) return;
      const v = p.get(el.name);
      if (el.type === 'checkbox' && el.dataset.multi !== undefined) el.checked = v.split(',').includes(el.value);
      else if (el.type === 'checkbox') el.checked = v === '1';
      else if (el.type === 'radio') el.checked = el.value === v;
      else if (el.tagName === 'SELECT') { if ([...el.options].some((x) => x.value === v)) el.value = v; }
      else el.value = v;
    });
  }
  const track = (name, extra = {}) => { if (window.gtag) gtag('event', name, { page: location.pathname, ...extra }); };
  const inApp = () => /KAKAOTALK|NAVER\(|Instagram|FBAN|FBAV|Threads|Line\//i.test(navigator.userAgent);
  function say(msg) { const c = document.getElementById('msg'); if (!c) return; c.textContent = msg; c.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => { c.hidden = true; }, 5000); }
  async function share() {
    const url = linkFromOpts(), title = document.title;
    if (navigator.share) {
      try { await navigator.share({ title, url }); track('share_sheet', { method: 'native' }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); say('링크를 복사했어요! 카톡이나 메모에 붙여 넣으면 같은 설정으로 열려요.'); track('share_sheet', { method: 'copy' }); }
    catch (e) { window.prompt('아래 링크를 복사하세요', url); track('share_sheet', { method: 'prompt' }); }
  }

  function render() {
    const o = opts();
    const n = Math.max(1, Math.min(10, o.sheets || 1));
    const qs = [], as = [];
    for (let i = 0; i < n; i++) {
      const r = cfg.gen(o, i);
      (r.pages || [r.page]).forEach((pg, j) => qs.push(page((r.titles && r.titles[j]) || r.title, pg, o, { count: r.count, noWho: r.noWho })));
      if (o.answer !== false) (r.answers || (r.answer ? [r.answer] : [])).forEach((pg) => as.push(page(r.title, pg, o, { ans: true })));
    }
    sheets.innerHTML = qs.join('') + as.join('');
    const c = document.getElementById('pcount');
    if (c) c.textContent = `A4 ${qs.length + as.length}쪽` + (as.length ? ` (문제 ${qs.length} + 정답 ${as.length})` : '');
    fit();
    save();
  }
  function fit() {
    const w = sheets.clientWidth;
    sheets.style.setProperty('--z', Math.min(1, w / 794).toFixed(3));
  }

  function init(c) {
    cfg = c;
    const start = () => {
      form = document.querySelector(c.form || '#opt');
      sheets = document.getElementById('sheets');
      load();
      optsFromLink();
      if (c.setup) c.setup(form);
      let t, changed = false, byButton = false;
      const noteChange = () => { if (!changed) { changed = true; track('change_option'); } };
      form.addEventListener('change', () => { noteChange(); if (c.onchange) c.onchange(form); render(); });
      form.addEventListener('input', (e) => { if (e.target.tagName === 'TEXTAREA' || e.target.type === 'text') { noteChange(); clearTimeout(t); t = setTimeout(render, 400); } });
      form.addEventListener('submit', (e) => e.preventDefault());
      const rg = document.getElementById('regen');
      if (rg) rg.onclick = () => { track('new_sheet'); render(); };
      document.getElementById('print').onclick = () => {
        byButton = true;
        const go = () => window.print();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
        track('print_sheet', { in_app: inApp() ? 1 : 0 });
      };
      // 단축키·브라우저 메뉴로 인쇄한 경우는 따로 셈
      window.addEventListener('beforeprint', () => { if (!byButton) track('print_browser'); });
      window.addEventListener('afterprint', () => { byButton = false; });
      const sh = document.getElementById('share');
      if (sh) sh.onclick = share;
      const ia = document.getElementById('inapp');
      if (ia && inApp()) ia.hidden = false;
      window.addEventListener('resize', fit);
      if (c.onchange) c.onchange(form);
      render();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }

  return { init, pack, cells, vcalc, grid, R, pick, shuffle, esc, chunk, range, frac, uniq, render };
})();
