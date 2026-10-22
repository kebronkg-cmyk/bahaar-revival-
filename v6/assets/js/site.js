/* BaHaar's Styling Studio – gemeinsame Interaktionen (alle Seiten) */
(() => {
  'use strict';

  const doc = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------------
     Öffnungszeiten – einzige Quelle für Live-Status
     (Wochentag: 0 = Sonntag … 6 = Samstag, Zeiten in Europe/Berlin)
     ------------------------------------------------------------------ */
  const HOURS = {
    0: null,
    1: ['10:00', '16:00'],
    2: ['09:00', '19:00'],
    3: ['09:00', '19:00'],
    4: ['09:00', '19:00'],
    5: ['09:00', '19:00'],
    6: ['09:00', '16:00'],
  };
  const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  function berlinNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
  }

  function openState() {
    const { day, minutes } = berlinNow();
    const today = HOURS[day];
    if (today) {
      const [o, c] = today.map(toMin);
      if (minutes >= o && minutes < c) {
        const left = c - minutes;
        return { state: left <= 45 ? 'soon' : 'open', text: left <= 45 ? `Schließt bald · bis ${today[1]}` : `Jetzt geöffnet · bis ${today[1]}`, day };
      }
      if (minutes < o) return { state: 'closed', text: `Öffnet heute um ${today[0]}`, day };
    }
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      if (HOURS[d]) {
        const label = i === 1 ? 'morgen' : DAY_NAMES[d];
        return { state: 'closed', text: `Geschlossen · ${label} ab ${HOURS[d][0]}`, day };
      }
    }
    return { state: 'closed', text: 'Geschlossen', day };
  }

  function renderOpenState() {
    const s = openState();
    document.querySelectorAll('[data-open-status]').forEach((el) => {
      el.classList.toggle('is-closed', s.state === 'closed');
      el.classList.toggle('is-soon', s.state === 'soon');
      const t = el.querySelector('[data-open-text]');
      if (t) t.textContent = s.text;
    });
    document.querySelectorAll('[data-hours] [data-day]').forEach((row) => {
      row.classList.toggle('is-today', Number(row.dataset.day) === s.day);
    });
  }
  renderOpenState();
  setInterval(renderOpenState, 60_000);

  /* ------------------------------------------------------------------
     Header: Zustand beim Scrollen + gleitender Glas-Indikator
     ------------------------------------------------------------------ */
  const header = document.querySelector('[data-header]');
  const onScrollHeader = () => header && header.classList.toggle('is-scrolled', scrollY > 24);
  onScrollHeader();
  addEventListener('scroll', onScrollHeader, { passive: true });

  // Auf langen Listen (Preise) blendet sich der Header beim Runterscrollen aus
  if (header && document.body.hasAttribute('data-hide-header')) {
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY;
      if (y > 320 && y > lastY + 6) { header.classList.add('is-hidden'); doc.classList.add('header-hidden'); }
      else if (y < lastY - 6 || y < 320) { header.classList.remove('is-hidden'); doc.classList.remove('header-hidden'); }
      lastY = y;
    }, { passive: true });
  }

  const nav = document.querySelector('[data-nav]');
  const blob = nav && nav.querySelector('.nav__blob');
  let activeLink = null;
  function moveBlob(link) {
    if (!blob) return;
    if (!link) { blob.style.opacity = '0'; return; }
    const navBox = nav.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    blob.style.setProperty('--x', `${box.left - navBox.left}px`);
    blob.style.width = `${box.width}px`;
    blob.style.opacity = '1';
  }
  if (nav) {
    const page = document.body.dataset.page;
    nav.querySelectorAll('a').forEach((a) => {
      if (page && a.dataset.page === page) { a.setAttribute('aria-current', 'page'); activeLink = a; }
      a.addEventListener('pointerenter', () => moveBlob(a));
      a.addEventListener('focus', () => moveBlob(a));
    });
    nav.addEventListener('pointerleave', () => moveBlob(activeLink));
    addEventListener('load', () => moveBlob(activeLink));
    addEventListener('resize', () => moveBlob(activeLink));

    // Scrollspy auf der Startseite
    const sections = [...nav.querySelectorAll('a[data-section]')]
      .map((a) => ({ a, el: document.getElementById(a.dataset.section) }))
      .filter((x) => x.el);
    if (sections.length) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const hit = sections.find((s) => s.el === e.target);
          if (!hit) return;
          if (e.isIntersecting) {
            sections.forEach((s) => s.a.classList.remove('is-active'));
            hit.a.classList.add('is-active');
            activeLink = hit.a;
          } else if (activeLink === hit.a) {
            hit.a.classList.remove('is-active');
            activeLink = null;
          }
          if (!nav.matches(':hover')) moveBlob(activeLink);
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => spy.observe(s.el));
    }
  }

  /* ------------------------------------------------------------------
     Mobiles Menü
     ------------------------------------------------------------------ */
  const menu = document.querySelector('[data-menu]');
  const toggle = document.querySelector('[data-menu-toggle]');
  function setMenu(open) {
    if (!menu || !toggle) return;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    document.body.classList.toggle('menu-open', open);
    if (open) menu.querySelector('a')?.focus({ preventScroll: true });
  }
  toggle?.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu?.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 1080px)').addEventListener?.('change', (m) => { if (m.matches) setMenu(false); });

  /* ------------------------------------------------------------------
     Online-Buchung im Glas-Dialog (Salonized)
     ------------------------------------------------------------------ */
  const booking = document.querySelector('[data-booking]');
  const frameWrap = booking?.querySelector('[data-booking-frame]');
  if (booking && typeof booking.showModal === 'function') {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-book]');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      setMenu(false);
      if (!frameWrap.querySelector('iframe')) {
        const iframe = document.createElement('iframe');
        iframe.title = 'Onlinebuchung bei BaHaar’s Styling Studio';
        iframe.src = link.href;
        iframe.loading = 'eager';
        iframe.allow = 'payment';
        iframe.addEventListener('load', () => frameWrap.classList.add('is-loaded'));
        frameWrap.appendChild(iframe);
      }
      booking.showModal();
      document.body.style.overflow = 'hidden';
    });
    booking.querySelector('[data-booking-close]')?.addEventListener('click', () => booking.close());
    booking.addEventListener('click', (e) => { if (e.target === booking) booking.close(); });
    booking.addEventListener('close', () => { document.body.style.overflow = ''; });
  }

  /* ------------------------------------------------------------------
     Überschriften wortweise einblenden
     ------------------------------------------------------------------ */
  function splitWords(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const span = document.createElement('span');
            span.className = 'split-word';
            span.style.setProperty('--i', i++);
            span.textContent = part;
            frag.appendChild(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          if (child.tagName === 'EM') child.classList.add('is-split');
          walk(child);
        }
      });
    };
    walk(el);
    // Satzzeichen direkt nach einer Hervorhebung nicht allein umbrechen lassen
    el.querySelectorAll('em.is-split').forEach((em) => {
      const next = em.nextSibling;
      if (next && next.nodeType === 1 && next.classList.contains('split-word') && /^[.,!?:;…]+$/.test(next.textContent)) {
        const keep = document.createElement('span');
        keep.className = 'nowrap';
        em.replaceWith(keep);
        keep.append(em, next);
      }
    });
    el.setAttribute('aria-label', label);
    el.classList.add('split-ready');
  }

  /* ------------------------------------------------------------------
     Reveal beim Scrollen
     ------------------------------------------------------------------ */
  const revealEls = document.querySelectorAll('[data-reveal], [data-split]');
  document.querySelectorAll('[data-split]').forEach((el) => { if (!reduceMotion) splitWords(el); });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
    revealEls.forEach((el) => {
      // Alles im ersten Bildschirm (Hero) erscheint sofort, auch ganz unten am Rand
      if (el.closest('[data-hero]')) el.classList.add('is-in'); else io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------------
     Blüten wachsen hinter Glas und Karten hervor
     Jede Blüte startet klein und eingedreht an ihrem Stielansatz (--go) und
     entfaltet sich, sobald ihr Abschnitt ins Bild kommt. Im Hero sofort.
     ------------------------------------------------------------------ */
  const growEls = [...document.querySelectorAll('[data-grow]')];
  if (growEls.length) {
    const grow = (el) => {
      el.classList.add('is-grown');
      // nach dem Wachsen keine Ebene mehr reservieren
      setTimeout(() => el.classList.add('is-settled'), 2200);
    };
    if (reduceMotion || !('IntersectionObserver' in window)) {
      growEls.forEach((el) => el.classList.add('is-grown', 'is-settled'));
    } else {
      doc.classList.add('can-grow');
      const gio = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          grow(e.target);
          gio.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      growEls.forEach((el) => {
        if (el.closest('[data-hero]')) requestAnimationFrame(() => requestAnimationFrame(() => grow(el)));
        else gio.observe(el);
      });
    }
  }

  /* ------------------------------------------------------------------
     Glas-Glanzlicht folgt dem Zeiger + sanftes Kippen
     ------------------------------------------------------------------ */
  if (finePointer && !reduceMotion) {
    let raf = 0;
    let lastEvent = null;
    document.addEventListener('pointermove', (e) => {
      lastEvent = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const ev = lastEvent;
        const glass = ev.target.closest?.('.glass');
        if (glass) {
          const r = glass.getBoundingClientRect();
          glass.style.setProperty('--mx', `${ev.clientX - r.left}px`);
          glass.style.setProperty('--my', `${ev.clientY - r.top}px`);
        }
      });
    }, { passive: true });

    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------
     Parallax für schwebende Orchideen
     ------------------------------------------------------------------ */
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')];
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight;
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const f = parseFloat(el.dataset.parallax) || 0;
        const delta = (r.top + r.height / 2 - vh / 2) * f;
        el.style.translate = `0 ${delta.toFixed(1)}px`;
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------
     Sternenhimmel im Finale
     ------------------------------------------------------------------ */
  document.querySelectorAll('[data-stars]').forEach((field) => {
    const count = innerWidth < 700 ? 70 : 140;
    const frag = document.createDocumentFragment();
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < count; i++) {
      const s = document.createElement('i');
      const size = rand() < 0.9 ? 1 + rand() * 1.4 : 2.4 + rand() * 1.6;
      s.style.cssText = `left:${(rand() * 100).toFixed(2)}%;top:${(rand() * 100).toFixed(2)}%;--s:${size.toFixed(1)}px;--o:${(0.35 + rand() * 0.6).toFixed(2)};--t:${(2.5 + rand() * 5).toFixed(1)}s;--delay:${(-rand() * 6).toFixed(1)}s`;
      frag.appendChild(s);
    }
    field.appendChild(frag);
  });

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  doc.classList.add('is-ready');
})();
