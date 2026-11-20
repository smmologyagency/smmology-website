/* Smmology design layer: reveals, headline motion, nav, pointer spotlight, magnetic buttons. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    var nav = document.querySelector('nav');

    /* Scroll progress line */
    var line = document.createElement('div');
    line.className = 'scroll-line'; line.setAttribute('aria-hidden', 'true');
    document.body.appendChild(line);

    /* Split h1/h2 text into words (keeps <em> and links intact) */
    function split(el) {
      if (el.dataset.split || el.querySelector('#typed-hero')) return;
      el.dataset.split = '1';
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var parts = n.textContent.split(/(\s+)/);
            var frag = document.createDocumentFragment();
            parts.forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
              var w = document.createElement('span'); w.className = 'w';
              var s = document.createElement('span'); s.textContent = p; s.style.setProperty('--d', (i++ * 0.06) + 's');
              w.appendChild(s); frag.appendChild(w);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
        });
      })(el);
      el.classList.add('split');
    }

    var heads = document.querySelectorAll('h1, section h2, .cta-section h2');
    if (!reduce) heads.forEach(split);

    /* Reveal targets, staggered among siblings */
    var sel = [
      '.eyebrow', '.eyebrow-pill', '.section-label', '.hero-badge', '.section-sub', '.hero p', '.hero-btns', '.hero-sub',
      '.card', '.addon', '.result-card', '.stage', '.value-card', '.post-card', '.product-card', '.faq-item',
      'section p.text-lg', 'section .grid > div', '.about-photo', '.photo-tile', '.brand-tile', '.smm-card',
      '.article > p', '.article > h2', '.article > ul', '.cta-band', '.post-meta', '.kit-total', '.upgrade-step'
    ].join(',');
    var targets = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (el) {
      return !el.closest('nav') && !el.closest('dialog') && !el.closest('[data-reveal]');
    });
    targets.forEach(function (el) {
      el.setAttribute('data-reveal', '');
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.matches(sel); });
      var idx = Math.min(sibs.indexOf(el), 6);
      if (idx > 0) el.style.setProperty('--d', (idx * 0.08) + 's');
    });

    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      document.querySelectorAll('[data-reveal], .split').forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll('[data-reveal], .split').forEach(function (el) { el.classList.add('is-in'); });
    }

    /* Above the fold: play right away, never wait on the observer */
    function revealVisible() {
      var vh = window.innerHeight;
      document.querySelectorAll('[data-reveal]:not(.is-in), .split:not(.is-in)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.95 && r.bottom > 0) el.classList.add('is-in');
      });
    }
    requestAnimationFrame(function () { setTimeout(revealVisible, 60); });
    setTimeout(revealVisible, 400);
    window.addEventListener('scroll', function () { requestAnimationFrame(revealVisible); }, { passive: true });

    /* Load sequence */
    var go = function () { requestAnimationFrame(function () { root.classList.add('is-loaded'); }); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    setTimeout(go, 900);

    /* Scroll: nav state, progress, hero image drift */
    var heroImg = document.querySelector('.hero-visual img');
    var ticking = false, scrollTimer;
    function onScroll() {
      var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
      line.style.setProperty('--p', h > 0 ? Math.min(y / h, 1) : 0);
      if (nav) { nav.classList.toggle('is-scrolled', y > 24); nav.classList.toggle('is-top', y <= 24); }
      if (heroImg && !reduce && y < window.innerHeight * 1.2) heroImg.style.setProperty('--py', (y * 0.12).toFixed(1) + 'px');
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      root.classList.add('is-scrolling'); clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () { root.classList.remove('is-scrolling'); }, 160);
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    if (reduce || !window.matchMedia('(hover: hover)').matches) return;

    /* Pointer spotlight on cards */
    document.querySelectorAll('.card, .addon, .result-card, .value-card, .post-card, .product-card, .stage').forEach(function (c) {
      c.classList.add('js-spot');
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* Magnetic buttons */
    document.querySelectorAll('.btn, .btn-primary, .btn-pink, .cta-btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.18, yy = (e.clientY - r.top - r.height / 2) * 0.28;
        b.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (yy - 2).toFixed(1) + 'px,0)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  });
})();
