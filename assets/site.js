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

    /* Mobile menu */
    var inner = nav && nav.querySelector('.nav-inner');
    var links = nav && nav.querySelector('.nav-links');
    if (inner && links) {
      if (!links.id) links.id = 'site-menu';
      var burger = document.createElement('button');
      burger.type = 'button'; burger.className = 'nav-burger';
      burger.setAttribute('aria-label', 'Open menu'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-controls', links.id);
      burger.innerHTML = '<span></span><span></span>';
      inner.appendChild(burger);
      var setOpen = function (open) {
        document.body.classList.toggle('menu-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      };
      burger.addEventListener('click', function () { setOpen(!document.body.classList.contains('menu-open')); });
      links.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    }

    /* Sticky call-to-action on phones */
    if (!/\/booked/.test(location.pathname)) {
      var bar = document.createElement('div');
      bar.className = 'mobile-cta';
      bar.innerHTML = '<a href="https://calendar.app.google/JQLJ23KJ7SjfpL8k9" target="_blank" rel="noopener" class="mc-primary">Book a Free Call</a>' +
        '<a href="https://app.smmology.us/signup?plan=monthly" class="mc-secondary">Join The Strategist</a>';
      document.body.appendChild(bar);
      var showBar = function () { bar.classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.7); };
      window.addEventListener('scroll', showBar, { passive: true }); showBar();
    }

    /* Heading font picker: preview only */
    var isPreview = /vercel\.app$|localhost|127\.0\.0\.1/.test(location.hostname) || /[?&]fonts/.test(location.search);
    if (isPreview) {
      var l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Instrument+Serif:ital@0;1&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Gloock&family=Young+Serif&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&family=Urbanist:ital,wght@0,400..800;1,400..800&display=swap';
      document.head.appendChild(l);
      var opts = [['gloock', 'D · Gloock'], ['young', 'E · Young Serif'], ['newsreader', 'F · Newsreader'], ['jakarta', 'G · Plus Jakarta Sans'], ['urbanist', 'H · Urbanist'], ['fraunces', 'A · Fraunces'], ['instrument', 'B · Instrument Serif'], ['bricolage', 'C · Bricolage Grotesque'], ['', 'Current · Cormorant']];
      var saved = 'gloock';
      try { saved = localStorage.getItem('smm-hf2') || 'gloock'; } catch (e) {}
      var pick = function (v) {
        if (v) root.setAttribute('data-hf', v); else root.removeAttribute('data-hf');
        try { localStorage.setItem('smm-hf2', v); } catch (e) {}
        box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'); });
      };
      var box = document.createElement('div'); box.className = 'font-picker';
      box.innerHTML = '<p>Heading font (preview only)</p>' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('');
      document.body.appendChild(box);
      box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) pick(b.dataset.v); });
      pick(saved);
    }

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
