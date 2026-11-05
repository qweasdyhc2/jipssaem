// 모든 쪽 공통: 찜, 최근 쓴 학습지(이 기기 브라우저에만 저장), 이달의 학습지
(function () {
  const get = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 동작 */ } };
  const FAV = 'js:fav', REC = 'js:recent', track = (n, x) => { if (window.gtag) gtag('event', n, x); };
  const here = document.getElementById('sheets') ? location.pathname.replace(/^\/|\.html$/g, '') : '';

  // 달이 바뀌었으면 그 달의 학습지로 교체 (다시 배포하지 않아도 됨)
  const mon = document.querySelector('.mon'), m = new Date().getMonth() + 1;
  if (mon && +mon.dataset.m !== m) { const t = document.querySelector(`template[data-m="${m}"]`); if (t) mon.replaceWith(t.content.cloneNode(true)); }

  if (here) put(REC, [here, ...get(REC).filter((s) => s !== here)].slice(0, 12));

  const tpl = document.getElementById('catalog');
  const pool = () => [...document.querySelectorAll('a.card[data-slug]'), ...(tpl ? tpl.content.querySelectorAll('a.card[data-slug]') : [])];
  function cards(slugs, go) {
    const all = pool();
    return slugs.map((s) => all.find((c) => c.dataset.slug === s && !c.closest('[data-mine]'))).filter(Boolean).map((c) => {
      const n = c.cloneNode(true); n.querySelectorAll('.fav').forEach((b) => b.remove()); n.dataset.go = go; return n;
    });
  }
  function fill(box, list) { box.replaceChildren(...list); return list.length; }
  function renderMine() {
    const favs = get(FAV), rec = get(REC);
    const home = document.getElementById('mine');
    if (home) {
      const n = fill(home.querySelector('.grid'), cards([...new Set([...favs, ...rec])].slice(0, 6), 'home-mine'));
      home.hidden = !n;
    }
    document.querySelectorAll('[data-my]').forEach((box) => {
      const fav = box.dataset.my === 'fav';
      const n = fill(box.querySelector('.grid'), cards(fav ? favs : rec.slice(0, 8), fav ? 'my-fav' : 'my-recent'));
      box.querySelector('.none').hidden = n > 0;
    });
    stars();
  }
  function paint(b, on) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  function stars() {
    const favs = get(FAV);
    document.querySelectorAll('a.card[data-slug]').forEach((c) => {
      let b = c.querySelector('.fav');
      if (!b) {
        b = document.createElement('button'); b.type = 'button'; b.className = 'fav'; b.textContent = '★';
        b.setAttribute('aria-label', c.querySelector('b').textContent + ' 찜하기'); c.append(b);
      }
      paint(b, favs.includes(c.dataset.slug));
    });
    const t = document.getElementById('fav');
    if (t) { const on = favs.includes(here); t.textContent = on ? '★ 찜했어요' : '☆ 찜하기'; t.classList.toggle('on', on); t.setAttribute('aria-pressed', on); }
  }
  function toggle(slug) {
    const favs = get(FAV), on = favs.includes(slug);
    put(FAV, on ? favs.filter((s) => s !== slug) : [slug, ...favs]);
    if (!on) track('favorite_add', { worksheet: slug });
    renderMine();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.fav');
    if (b) { e.preventDefault(); e.stopPropagation(); toggle(b.closest('a.card').dataset.slug); return; }
    if (e.target.closest('#fav')) toggle(here);
  }, true);
  renderMine();
})();
