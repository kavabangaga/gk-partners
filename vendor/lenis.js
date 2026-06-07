/* Локальный плавный скролл (API-совместим с window.Lenis, без внешних зависимостей).
   Поддерживает: new Lenis({lerp, wheelMultiplier}), .raf(t), .scrollTo(target,{offset}), .on('scroll', cb).
   Работает с фикс-холстом (html{zoom}) — все scroll-метрики в одном визуальном пространстве. */
(function () {
  'use strict';
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  class Lenis {
    constructor(opts) {
      opts = opts || {};
      this.lerp = opts.lerp != null ? opts.lerp : 0.1;
      this.wheelMultiplier = opts.wheelMultiplier != null ? opts.wheelMultiplier : 1;
      this._cbs = [];
      this._driving = false;
      this.current = window.scrollY || window.pageYOffset || 0;
      this.target = this.current;

      this._onWheel = this._onWheel.bind(this);
      window.addEventListener('wheel', this._onWheel, { passive: false });
      // классы для CSS: отключают нативный scroll-behavior, чтобы не было двойного сглаживания
      document.documentElement.classList.add('lenis', 'lenis-smooth');

      // Синхронизация, когда скроллят иначе (скроллбар, клавиатура, тач)
      window.addEventListener('scroll', () => {
        if (!this._driving) {
          this.current = window.scrollY;
          this.target = window.scrollY;
        }
      }, { passive: true });
    }

    _max() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    _onWheel(e) {
      if (e.ctrlKey) return;            // не мешаем зуму страницы
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16;   // строки → px
      else if (e.deltaMode === 2) d *= window.innerHeight;
      this.target = clamp(this.target + d * this.wheelMultiplier, 0, this._max());
      this._driving = true;
    }

    on(ev, cb) { if (ev === 'scroll') this._cbs.push(cb); }

    raf() {
      const diff = this.target - this.current;
      if (Math.abs(diff) < 0.08) {
        if (this._driving) {
          this.current = this.target;
          window.scrollTo(0, this.current);
          this._driving = false;
          this._emit();
        }
        return;
      }
      this.current += diff * this.lerp;
      this._driving = true;
      window.scrollTo(0, this.current);
      this._emit();
    }

    _emit() { for (const cb of this._cbs) cb({ scroll: this.current }); }

    scrollTo(target, opts) {
      opts = opts || {};
      let y;
      if (typeof target === 'number') {
        y = target;
      } else {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;
        y = el.getBoundingClientRect().top + window.scrollY;
      }
      y += opts.offset || 0;
      this.target = clamp(y, 0, this._max());
      this._driving = true;
    }
  }

  window.Lenis = Lenis;
})();
