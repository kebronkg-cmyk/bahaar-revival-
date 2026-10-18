/* BaHaar's Styling Studio – Startseite */
(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Glas-Band: Inhalte verdoppeln für eine nahtlose Endlosschleife
     ------------------------------------------------------------------ */
  document.querySelectorAll('[data-marquee]').forEach((track) => {
    const list = track.querySelector('ul');
    if (!list || reduceMotion) return;
    const clone = list.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    const setDur = () => {
      const w = list.scrollWidth;
      [list, clone].forEach((l) => l.style.setProperty('--dur', `${Math.max(30, w / 55)}s`));
    };
    setDur();
    addEventListener('load', setDur);
  });

  /* ------------------------------------------------------------------
     Bewertungen: zwei gegenläufig fließende Reihen
     ------------------------------------------------------------------ */
  const reviewsWrap = document.querySelector('[data-reviews]');
  const source = reviewsWrap?.querySelector('[data-review-source]');
  if (reviewsWrap && source && !reduceMotion) {
    const items = [...source.children];
    const rows = [1, 2].map((n) => items.filter((li) => li.dataset.row === String(n)));
    source.remove();
    rows.forEach((rowItems, idx) => {
      const row = document.createElement('div');
      row.className = `review-row${idx === 1 ? ' review-row--reverse' : ''}`;
      const track = document.createElement('ul');
      track.className = 'review-row__track';
      rowItems.forEach((li) => track.appendChild(li));
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('a, button').forEach((el) => el.setAttribute('tabindex', '-1'));
      row.append(track, clone);
      reviewsWrap.appendChild(row);
      const setDur = () => {
        const w = track.scrollWidth;
        const speed = idx === 0 ? 42 : 36; // px pro Sekunde
        [track, clone].forEach((t) => t.style.setProperty('--dur', `${(w / speed).toFixed(1)}s`));
      };
      setDur();
      addEventListener('load', setDur);
    });
  }

  /* ------------------------------------------------------------------
     Preis-Ausschnitt: Kategorien + Haarlänge
     ------------------------------------------------------------------ */
  const panel = document.querySelector('[data-price-panel]');
  if (panel) {
    const seg = panel.querySelector('[data-segmented]');
    const tabs = [...seg.querySelectorAll('[role="tab"]')];
    const segThumb = seg.querySelector('.segmented__thumb');
    const lenWrap = panel.querySelector('[data-length-toggle]');
    const lenBtns = [...lenWrap.querySelectorAll('[role="radio"]')];
    const lenThumb = lenWrap.querySelector('.length-toggle__thumb');
    let length = 'short';

    const placeThumb = (thumb, btn) => {
      thumb.style.setProperty('--x', `${btn.offsetLeft}px`);
      thumb.style.setProperty('--w', `${btn.offsetWidth}px`);
    };

    const formatPrice = (v) => `${v} €`;
    function applyLength(animate) {
      panel.querySelectorAll('[data-short]').forEach((el) => {
        const v = el.dataset[length];
        if (el.textContent !== formatPrice(v)) {
          el.textContent = formatPrice(v);
          if (animate) { el.classList.remove('is-flip'); void el.offsetWidth; el.classList.add('is-flip'); }
        }
      });
    }

    function selectTab(tab, focus) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const p = panel.querySelector(`[data-panel="${t.dataset.tab}"]`);
        p.hidden = !on;
        if (on && !reduceMotion) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
      });
      placeThumb(segThumb, tab);
      if (focus) tab.focus();
      const active = panel.querySelector(`[data-panel="${tab.dataset.tab}"]`);
      lenWrap.classList.toggle('is-disabled', !active.querySelector('[data-short]'));
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => selectTab(t));
      t.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
        if (dir) { e.preventDefault(); selectTab(tabs[(i + dir + tabs.length) % tabs.length], true); }
      });
    });

    function selectLength(btn, focus) {
      length = btn.dataset.length;
      lenBtns.forEach((b) => { const on = b === btn; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      placeThumb(lenThumb, btn);
      applyLength(true);
      if (focus) btn.focus();
    }
    lenBtns.forEach((b, i) => {
      b.addEventListener('click', () => selectLength(b));
      b.addEventListener('keydown', (e) => {
        if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          selectLength(lenBtns[(i + 1) % lenBtns.length], true);
        }
      });
    });

    const layout = () => {
      placeThumb(segThumb, tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
      placeThumb(lenThumb, lenBtns.find((b) => b.getAttribute('aria-checked') === 'true'));
    };
    layout();
    document.fonts?.ready.then(layout);
    addEventListener('resize', layout);
  }

  /* ------------------------------------------------------------------
     Galerie: Ziehen, Pfeile, Fortschritt, Lightbox
     ------------------------------------------------------------------ */
  const rail = document.querySelector('[data-gallery]');
  if (rail) {
    const progress = document.querySelector('[data-gallery-progress]');
    const updateProgress = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const ratio = rail.clientWidth / rail.scrollWidth;
      const track = progress.parentElement.clientWidth;
      const w = Math.max(0.12, ratio) * track;
      progress.style.setProperty('--w', `${w}px`);
      progress.style.setProperty('--x', `${max > 0 ? (rail.scrollLeft / max) * (track - w) : 0}px`);
    };
    rail.addEventListener('scroll', updateProgress, { passive: true });
    addEventListener('resize', updateProgress);
    addEventListener('load', updateProgress);
    updateProgress();

    const step = () => Math.max(260, rail.clientWidth * 0.7);
    document.querySelector('[data-gallery-prev]')?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    document.querySelector('[data-gallery-next]')?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    rail.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); rail.scrollBy({ left: step(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); rail.scrollBy({ left: -step(), behavior: 'smooth' }); }
    });

    // Ziehen mit der Maus (Touch scrollt nativ)
    let down = null;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = { x: e.clientX, left: rail.scrollLeft, moved: false };
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 5 && !down.moved) { down.moved = true; rail.classList.add('is-dragging'); }
      if (down.moved) rail.scrollLeft = down.left - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      const moved = down.moved;
      down = null;
      if (moved) {
        rail.classList.remove('is-dragging');
        const items = [...rail.querySelectorAll('li')];
        const pad = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
        const target = items.reduce((best, li) => {
          const d = Math.abs(li.offsetLeft - pad - rail.scrollLeft);
          return d < best.d ? { d, li } : best;
        }, { d: Infinity, li: null }).li;
        if (target) rail.scrollTo({ left: target.offsetLeft - pad, behavior: 'smooth' });
      }
    });

    // Lightbox
    const lb = document.querySelector('[data-lightbox]');
    const looks = [...rail.querySelectorAll('[data-look]')];
    if (lb && typeof lb.showModal === 'function') {
      const img = lb.querySelector('[data-lightbox-img]');
      const cap = lb.querySelector('[data-lightbox-caption]');
      let idx = 0;
      const show = (i) => {
        idx = (i + looks.length) % looks.length;
        const btn = looks[idx];
        const thumb = btn.querySelector('img');
        img.src = btn.dataset.look;
        img.alt = thumb.alt;
        cap.textContent = btn.querySelector('.look__tag')?.textContent || '';
      };
      looks.forEach((btn, i) => btn.addEventListener('click', () => { show(i); lb.showModal(); }));
      lb.querySelector('[data-lightbox-close]').addEventListener('click', () => lb.close());
      lb.querySelector('[data-lightbox-prev]').addEventListener('click', () => show(idx - 1));
      lb.querySelector('[data-lightbox-next]').addEventListener('click', () => show(idx + 1));
      lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
      lb.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') show(idx + 1);
        if (e.key === 'ArrowLeft') show(idx - 1);
      });
      let touchX = null;
      lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
        touchX = null;
      });
    }
  }

  /* ------------------------------------------------------------------
     Karte erst nach Klick laden (Datenschutz)
     ------------------------------------------------------------------ */
  const map = document.querySelector('[data-map]');
  map?.querySelector('[data-map-load]')?.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.title = 'Karte: Perlacher Straße 2, 81539 München';
    iframe.loading = 'lazy';
    iframe.src = 'https://www.openstreetmap.org/export/embed.html?bbox=11.5715%2C48.1105%2C11.5841%2C48.1162&layer=mapnik&marker=48.113332%2C11.577779';
    map.querySelector('.map__placeholder').replaceWith(iframe);
  });
})();
