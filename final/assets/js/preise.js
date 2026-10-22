/* BaHaar's Styling Studio – Preisseite: Suche, Kategorie-Navigation, Haarlänge, Terminplaner */
(() => {
  'use strict';

  const body = document.body;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* privat / blockiert */ } },
  };

  const sections = [...document.querySelectorAll('[data-cat]')];
  const items = [...document.querySelectorAll('.svc')];
  const total = items.length;
  const fmtEuro = (n) => `${n} €`;
  const nameOf = (li) => li.querySelector('.svc__name').dataset.label || li.querySelector('.svc__name').textContent.trim();
  items.forEach((li) => { const n = li.querySelector('.svc__name'); n.dataset.label = n.textContent.trim(); });

  /* ------------------------------------------------------------------
     Haarlänge
     ------------------------------------------------------------------ */
  const lenWrap = document.querySelector('[data-length-toggle]');
  const lenBtns = [...lenWrap.querySelectorAll('[role="radio"]')];
  const lenThumb = lenWrap.querySelector('.length-toggle__thumb');
  let length = store.get('bahaar-length', 'short') === 'long' ? 'long' : 'short';

  const placeThumb = () => {
    const btn = lenBtns.find((b) => b.dataset.length === length);
    lenThumb.style.setProperty('--x', `${btn.offsetLeft}px`);
    lenThumb.style.setProperty('--w', `${btn.offsetWidth}px`);
  };
  function setLength(next, focus) {
    length = next;
    body.dataset.length = length;
    lenBtns.forEach((b) => {
      const on = b.dataset.length === length;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    placeThumb();
    store.set('bahaar-length', length);
    renderPlanner();
  }
  lenBtns.forEach((b, i) => {
    b.addEventListener('click', () => setLength(b.dataset.length));
    b.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        setLength(lenBtns[(i + 1) % 2].dataset.length, true);
      }
    });
  });

  /* ------------------------------------------------------------------
     Kategorie-Navigation mit gleitendem Glas-Indikator
     ------------------------------------------------------------------ */
  const catnav = document.querySelector('[data-catnav]');
  const navLinks = [...catnav.querySelectorAll('[data-nav-cat]')];
  const blob = catnav.querySelector('.catnav__blob');
  let activeId = null;

  function moveBlob() {
    const link = navLinks.find((a) => a.dataset.navCat === activeId);
    if (!link) { catnav.classList.remove('is-ready'); return; }
    blob.style.setProperty('--x', `${link.offsetLeft}px`);
    blob.style.setProperty('--y', `${link.offsetTop}px`);
    blob.style.setProperty('--w', `${link.offsetWidth}px`);
    blob.style.setProperty('--h', `${link.offsetHeight}px`);
    catnav.classList.add('is-ready');
    // horizontale Leiste (mobil): aktive Kategorie sichtbar halten
    if (catnav.scrollWidth > catnav.clientWidth + 4) {
      const target = link.offsetLeft - catnav.clientWidth / 2 + link.offsetWidth / 2;
      catnav.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    navLinks.forEach((a) => {
      const on = a.dataset.navCat === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    moveBlob();
  }

  // Scrollspy: die Kategorie, die die Lesezone oben durchquert, ist aktiv
  const visibleCats = new Map();
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => visibleCats.set(e.target.id, e.isIntersecting));
    const first = sections.find((s) => !s.hidden && visibleCats.get(s.id));
    if (first) setActive(first.id);
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach((s) => spy.observe(s));

  navLinks.forEach((a) => a.addEventListener('click', (e) => {
    const target = document.getElementById(a.dataset.navCat);
    if (!target) return;
    e.preventDefault();
    setActive(a.dataset.navCat);
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${a.dataset.navCat}`);
  }));

  /* ------------------------------------------------------------------
     Intelligente Suche: umlaut-tolerant, Synonyme (data-kw), Tippfehler
     ------------------------------------------------------------------ */
  const input = document.querySelector('[data-search]');
  const clearBtn = document.querySelector('[data-search-clear]');
  const status = document.querySelector('[data-status]');
  const empty = document.querySelector('[data-empty]');

  // längenerhaltende Normalisierung (für Markierungen im Originaltext)
  const norm = (s) => s.toLowerCase().replace(/[äàáâ]/g, 'a').replace(/[öòóô]/g, 'o').replace(/[üùúû]/g, 'u').replace(/[éèê]/g, 'e');
  const index = items.map((li) => {
    const text = norm(`${nameOf(li)} ${li.querySelector('.svc__meta')?.textContent || ''} ${li.dataset.kw || ''}`);
    return { li, text, words: [...new Set(text.split(/[^a-z0-9ß]+/).filter((w) => w.length > 2))] };
  });

  function editDistance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let best = cur[0];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        best = Math.min(best, cur[j]);
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  const tokenMatches = (entry, token) => {
    if (entry.text.includes(token)) return true;
    if (token.length < 4) return false;
    const max = token.length >= 7 ? 2 : 1;
    return entry.words.some((w) => editDistance(token, w.slice(0, token.length + 1), max) <= max || editDistance(token, w, max) <= max);
  };

  function highlight(li, tokens) {
    const el = li.querySelector('.svc__name');
    const label = el.dataset.label;
    if (!tokens.length) { el.textContent = label; return; }
    const n = norm(label);
    const marks = new Array(label.length).fill(false);
    tokens.forEach((t) => {
      let i = n.indexOf(t);
      while (i !== -1) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = n.indexOf(t, i + t.length); }
    });
    let html = '';
    let open = false;
    const esc = (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c);
    for (let k = 0; k < label.length; k++) {
      if (marks[k] && !open) { html += '<mark>'; open = true; }
      if (!marks[k] && open) { html += '</mark>'; open = false; }
      html += esc(label[k]);
    }
    if (open) html += '</mark>';
    el.innerHTML = html;
  }

  let lastQuery = '';
  function search(raw) {
    const q = raw.trim();
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    let hits = 0;
    index.forEach((entry) => {
      const ok = tokens.every((t) => tokenMatches(entry, t));
      entry.li.hidden = !ok;
      if (ok) hits++;
      highlight(entry.li, ok ? tokens : []);
    });
    sections.forEach((sec) => {
      const visible = sec.querySelectorAll('.svc:not([hidden])').length;
      sec.hidden = visible === 0;
      const countEl = sec.querySelector('[data-count]');
      countEl.textContent = visible;
      countEl.classList.toggle('is-one', visible === 1);
      const link = navLinks.find((a) => a.dataset.navCat === sec.id);
      link.querySelector('[data-nav-count]').textContent = visible;
      link.classList.toggle('is-empty', visible === 0);
    });
    empty.hidden = hits > 0;
    clearBtn.hidden = !q;
    status.textContent = !q ? `${total} Leistungen` : hits ? `${hits} Treffer für „${q}“` : `Keine Treffer für „${q}“`;
    const firstVisible = sections.find((s) => !s.hidden);
    if (firstVisible && (!activeId || document.getElementById(activeId)?.hidden)) setActive(firstVisible.id);
    requestAnimationFrame(moveBlob);

    if (q !== lastQuery) {
      lastQuery = q;
      const url = new URL(location.href);
      if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }
  }

  let searchTimer = 0;
  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      search(input.value);
      const listTop = document.getElementById('preisliste').getBoundingClientRect().top;
      if (input.value && listTop < 0) document.getElementById('preisliste').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }, 90);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; search(''); } });
  clearBtn.addEventListener('click', () => { input.value = ''; search(''); input.focus(); });
  document.querySelectorAll('[data-suggest]').forEach((b) => b.addEventListener('click', () => {
    input.value = b.dataset.suggest;
    search(input.value);
    input.focus();
  }));
  addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) {
      e.preventDefault();
      input.focus();
    }
  });

  /* ------------------------------------------------------------------
     Terminplaner
     ------------------------------------------------------------------ */
  const planner = document.querySelector('[data-planner]');
  const pBody = planner.querySelector('[data-planner-body]');
  const pToggle = planner.querySelector('[data-planner-toggle]');
  const pList = planner.querySelector('[data-planner-list]');
  const pCount = planner.querySelector('[data-planner-count]');
  const pTotal = planner.querySelector('[data-planner-total]');
  const pDur = planner.querySelector('[data-planner-dur]');
  const byId = new Map(items.map((li) => [li.dataset.id, li]));
  let picked = new Set(store.get('bahaar-planner', []).filter((id) => byId.has(id)));

  function priceOf(li) {
    const p1 = Number(li.dataset.p1);
    const p2 = li.dataset.p2 ? Number(li.dataset.p2) : null;
    const base = length === 'long' && p2 ? p2 : p1;
    const max = li.dataset.p1max ? Number(li.dataset.p1max) : base;
    return { min: base, max, from: 'from' in li.dataset };
  }
  const priceLabel = ({ min, max, from }) => (from ? 'ab ' : '') + (min === max ? fmtEuro(min) : `${min} bis ${fmtEuro(max)}`);
  function durationLabel(mins) {
    if (!mins) return '';
    const h = Math.floor(mins / 60), m = mins % 60;
    return `ca. ${h ? `${h} Std.` : ''}${h && m ? ' ' : ''}${m ? `${m} Min.` : ''}`;
  }

  function renderPlanner() {
    const list = [...picked].map((id) => byId.get(id)).filter(Boolean);
    items.forEach((li) => {
      const on = picked.has(li.dataset.id);
      li.classList.toggle('is-picked', on);
      const btn = li.querySelector('.svc__add');
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', `${nameOf(li)} ${on ? 'aus dem Terminplaner entfernen' : 'zum Terminplaner hinzufügen'}`);
    });
    planner.hidden = list.length === 0;
    body.classList.toggle('has-planner', list.length > 0);
    if (!list.length) { pBody.hidden = true; pToggle.setAttribute('aria-expanded', 'false'); }

    let min = 0, max = 0, from = false, mins = 0, unknown = 0;
    pList.textContent = '';
    list.forEach((li) => {
      const p = priceOf(li);
      min += p.min; max += p.max; from = from || p.from;
      if (li.dataset.dur) mins += Number(li.dataset.dur); else unknown++;
      const row = document.createElement('li');
      row.innerHTML = `<span></span><b>${priceLabel(p)}</b><button type="button" aria-label="Entfernen"><svg aria-hidden="true"><use href="assets/img/icons.svg#i-close"/></svg></button>`;
      row.querySelector('span').textContent = nameOf(li);
      row.querySelector('button').addEventListener('click', () => toggle(li.dataset.id));
      pList.appendChild(row);
    });
    pCount.textContent = list.length;
    pTotal.textContent = priceLabel({ min, max, from });
    const durText = durationLabel(mins);
    pDur.textContent = [durText || null, unknown ? `${unknown} ohne Zeitangabe` : null].filter(Boolean).join(' · ') || `${list.length} Leistung${list.length === 1 ? '' : 'en'}`;
    store.set('bahaar-planner', [...picked]);
  }

  function flyTo(fromEl) {
    if (reduceMotion || !fromEl || planner.hidden) return;
    const a = fromEl.getBoundingClientRect();
    const b = pCount.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'fly-dot';
    document.body.appendChild(dot);
    const x0 = a.left + a.width / 2 - 9, y0 = a.top + a.height / 2 - 9;
    const x1 = b.left + b.width / 2 - 9, y1 = b.top + b.height / 2 - 9;
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 120;
    dot.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1)` },
      { transform: `translate(${mx}px, ${my}px) scale(1.3)`, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.4)`, opacity: 0.6 },
    ], { duration: 720, easing: 'cubic-bezier(.5,0,.3,1)' }).finished.then(() => {
      dot.remove();
      pCount.classList.remove('is-bump'); void pCount.offsetWidth; pCount.classList.add('is-bump');
    });
  }

  function toggle(id, sourceEl) {
    if (picked.has(id)) picked.delete(id); else picked.add(id);
    const added = picked.has(id);
    renderPlanner();
    if (added) flyTo(sourceEl);
  }
  items.forEach((li) => li.querySelector('.svc__add').addEventListener('click', (e) => toggle(li.dataset.id, e.currentTarget)));

  pToggle.addEventListener('click', () => {
    const open = pToggle.getAttribute('aria-expanded') !== 'true';
    pToggle.setAttribute('aria-expanded', String(open));
    pBody.hidden = !open;
  });
  planner.querySelector('[data-planner-clear]').addEventListener('click', () => { picked = new Set(); renderPlanner(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pBody.hidden) { pBody.hidden = true; pToggle.setAttribute('aria-expanded', 'false'); pToggle.focus(); }
  });

  /* WhatsApp: Auswahl als fertige Nachricht an das Studio */
  const WHATSAPP = '49896923644'; // Nummer des Studios für WhatsApp (ohne +, ohne Leerzeichen)
  const waBtn = planner.querySelector('[data-planner-wa]');
  const waText = () => {
    const list = [...picked].map((id) => byId.get(id)).filter(Boolean);
    return [
      'Hallo Bahar, ich interessiere mich für folgende Leistungen:',
      ...list.map((li) => `• ${nameOf(li)} (${priceLabel(priceOf(li)).replace(' ', ' ')})`),
      `Haarlänge: ${length === 'long' ? 'lang' : 'kurz/mittel'}`,
      `Richtwert: ${pTotal.textContent.replace(' ', ' ')} · ${pDur.textContent}`,
      'Wann hättest du einen Termin frei? Danke!',
    ].join('\n');
  };
  waBtn?.addEventListener('click', (e) => {
    waBtn.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waText())}`;
  });

  const copyBtn = planner.querySelector('[data-planner-copy]');
  copyBtn.addEventListener('click', async () => {
    const list = [...picked].map((id) => byId.get(id));
    const lines = list.map((li) => `• ${nameOf(li)} (${priceLabel(priceOf(li)).replace(' ', ' ')})`);
    const text = [
      'Meine Wunschleistungen bei BaHaar’s Styling Studio',
      `Haarlänge: ${length === 'long' ? 'lang' : 'kurz/mittel'}`,
      ...lines,
      `Richtwert: ${pTotal.textContent.replace(' ', ' ')} · ${pDur.textContent}`,
    ].join('\n');
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    const label = copyBtn.querySelector('[data-copy-label]');
    label.textContent = ok ? 'Kopiert ✓' : 'Kopieren nicht möglich';
    setTimeout(() => { label.textContent = 'Liste kopieren'; }, 2200);
  });

  /* ------------------------------------------------------------------
     Nach oben
     ------------------------------------------------------------------ */
  const toTop = document.querySelector('[data-to-top]');
  const onScroll = () => toTop.classList.toggle('is-visible', scrollY > innerHeight * 1.2);
  addEventListener('scroll', onScroll, { passive: true });
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ------------------------------------------------------------------
     Höhe der Werkzeugleiste für die Sticky-Abstände messen
     ------------------------------------------------------------------ */
  const toolbar = document.querySelector('[data-toolbar]');
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--toolbar-h', `${toolbar.offsetHeight}px`);
  }).observe(toolbar);
  const small = matchMedia('(max-width: 600px)');
  const setPlaceholder = () => { input.placeholder = small.matches ? 'Suchen' : 'Leistung suchen, z. B. Balayage, Bart, Hochzeit'; };
  setPlaceholder();
  small.addEventListener?.('change', setPlaceholder);

  /* ------------------------------------------------------------------
     Start
     ------------------------------------------------------------------ */
  setLength(length);
  const q = new URL(location.href).searchParams.get('q');
  if (q) { input.value = q; search(q); } else search('');
  setActive(location.hash && document.getElementById(location.hash.slice(1))?.matches('[data-cat]') ? location.hash.slice(1) : sections[0].id);
  const relayout = () => { placeThumb(); moveBlob(); };
  document.fonts?.ready.then(relayout);
  addEventListener('resize', relayout);
  onScroll();
})();
