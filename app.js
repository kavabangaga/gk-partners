/* Галеев Карнаухова — интерактив лендинга (только визуал, без бэкенда) */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Lenis: мягкий плавный скролл всего сайта ---- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({
      lerp: 0.085,            // мягкое «догоняющее» сглаживание
      wheelMultiplier: 0.9,
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const smoothTo = (target, offset) => {
    if (lenis) lenis.scrollTo(target, { offset: offset || 0, duration: 1.25 });
    else {
      const top = (typeof target === 'number')
        ? target
        : target.getBoundingClientRect().top + window.scrollY + (offset || 0);
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  /* ---- Прелоадер: крупный логотип в центре → уменьшается и улетает в позицию бара → синеет → фон белеет → исчезает ---- */
  const preloader = document.getElementById('preloader');
  if (preloader) {
    const logo = preloader.querySelector('.preloader__logo');
    const finish = () => {
      preloader.classList.add('hidden');
      setTimeout(() => preloader.remove(), 600);
    };
    const run = () => {
      if (reduce || !logo) { finish(); return; }
      // FLIP: вычисляем стартовый transform (центр экрана, крупно) от финальной позиции
      const r = logo.getBoundingClientRect();
      const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (window.innerWidth / 2 - cx) / zoom;   // в локальные (до-zoom) px
      const dy = (window.innerHeight / 2 - cy) / zoom;
      const S = 2.6; // во сколько раз крупнее в центре
      // 1 — ставим логотип в центр (крупно), прозрачным
      logo.style.transform = `translate(${dx}px, ${dy}px) scale(${S})`;
      logo.style.opacity = '0';
      // 2 — плавное появление из прозрачности по центру
      requestAnimationFrame(() => requestAnimationFrame(() => {
        logo.style.transition = 'opacity .7s var(--ease)';
        logo.style.opacity = '1';
      }));
      // 3 — после появления — полёт к финальной позиции (уменьшение + смещение в угол)
      setTimeout(() => {
        logo.style.transition = 'transform 1.15s cubic-bezier(0.5, 0, 0.12, 1)';
        logo.style.transform = 'none';
      }, 950);
      setTimeout(() => preloader.classList.add('land'), 2150); // синеет + фон белеет
      setTimeout(finish, 2800);                                 // фон исчезает
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run);
  }

  /* ---- Мобильное меню: бургер ---- */
  const sidebar = document.getElementById('sidebar');
  const burger = document.getElementById('navBurger');
  if (burger && sidebar) {
    burger.addEventListener('click', () => {
      const open = sidebar.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  /* ---- Reveal при скролле (fade + лёгкий подъём) ---- */
  const reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---- Анимация счётчика метрик ---- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    /* Резервируем точную ширину итогового числа: «+» прижат вплотную в покое,
       но не прыгает во время анимации (промежуточные значения короче). */
    el.style.display = 'inline-block';
    el.style.textAlign = 'left';
    el.textContent = String(Math.round(target));
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    if (reduce) { el.textContent = target; return; }
    el.textContent = '0';
    const dur = 1500;
    const start = performance.now();
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    let done = false;
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(tick);
      else { el.textContent = target; done = true; }
    }
    requestAnimationFrame(tick);
    /* Фолбэк: гарантированно показать итог, если rAF приостановлен */
    setTimeout(() => { if (!done) el.textContent = target; }, dur + 250);
  }
  const metrics = document.getElementById('metrics');
  if (metrics) {
    let counted = false;
    const tryCount = () => {
      if (counted) return;
      const r = metrics.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.92 && r.bottom > 0) {
        counted = true;
        metrics.querySelectorAll('[data-count]').forEach(animateCount);
        window.removeEventListener('scroll', tryCount);
      }
    };
    tryCount();
    requestAnimationFrame(tryCount);
    setTimeout(tryCount, 250);
    setTimeout(tryCount, 700);
    window.addEventListener('scroll', tryCount, { passive: true });
    window.addEventListener('load', tryCount);
  }

  /* ---- Плавный скролл к якорям + закрытие мобильного меню ---- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const tgt = document.querySelector(id);
      if (!tgt) return;
      e.preventDefault();
      const top = tgt.getBoundingClientRect().top + window.scrollY - 18;
      smoothTo(top);
      history.replaceState(null, '', id);
      if (sidebar) {
        sidebar.classList.remove('open');
        if (burger) burger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ---- Подсветка активного пункта меню при скролле ----
     Ничего не подчёркнуто на загрузке; пункт активируется, только
     когда соответствующая секция дошла до верхней зоны экрана. */
  const navLinks = [...document.querySelectorAll('.sidebar__nav a')];
  const navTargets = navLinks
    .map((a) => ({ a, sec: document.querySelector(a.getAttribute('href')) }))
    .filter((t) => t.sec);
  if (navTargets.length) {
    const updateActive = () => {
      const line = window.innerHeight * 0.35; // зона активации у верха экрана
      let current = null;
      navTargets.forEach((t) => {
        if (t.sec.getBoundingClientRect().top <= line) current = t.a;
      });
      navLinks.forEach((a) => a.classList.toggle('active', a === current));
    };
    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    if (lenis) lenis.on('scroll', updateActive);
  }

  /* ---- Плавающая кнопка «Наверх» ---- */
  const toTop = document.getElementById('toTop');
  if (toTop) {
    const toggleTop = () => toTop.classList.toggle('show', window.scrollY > 600);
    toggleTop();
    window.addEventListener('scroll', toggleTop, { passive: true });
    toTop.addEventListener('click', () => {
      smoothTo(0);
    });
  }

  /* ---- Авто-масштаб десктопа: фиксированный холст 1920px → zoom ----
     Сайт всегда отрисовывается в одной раскладке (как в макете) и
     пропорционально масштабируется под любое десктопное разрешение.
     На мобильных (<769px) — обычная адаптивная вёрстка. */
  const DESIGN_W = 1920;
  const root = document.documentElement;
  function applyScale() {
    root.style.zoom = '';
    if (window.innerWidth >= 769) {
      const vw = root.clientWidth; // реальная ширина вьюпорта (без полосы прокрутки)
      const z = vw / DESIGN_W;
      root.style.zoom = z;
      // Hero на весь экран: высота в дизайн-px = реальная высота окна / zoom
      root.style.setProperty('--screen-h', (window.innerHeight / z) + 'px');
    } else {
      root.style.removeProperty('--screen-h');
    }
  }
  applyScale();
  let raf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(applyScale);
  });
})();
