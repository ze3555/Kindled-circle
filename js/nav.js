// js/nav.js — smooth scroll, active highlight, keyboard nav for quicknav
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const links = Array.from(document.querySelectorAll('.navlink'));
    if (!links.length) return;

    // Map links -> target elements (some targets may be absent; keep null placeholders)
    const items = links.map(l => {
      const href = l.getAttribute('href') || '';
      const id = href.startsWith('#') ? href.slice(1) : null;
      const target = id ? document.getElementById(id) : null;
      return { link: l, id, target };
    });

    // Smooth scroll with header offset (calculate header height if present)
    function scrollToTarget(targetEl) {
      if (!targetEl) {
        // fallback: small scroll to top if no target
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const header = document.querySelector('.header-inner');
      const headerOffset = header ? Math.max(0, header.getBoundingClientRect().height + 8) : 64;
      const top = targetEl.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    }

    // Click handlers
    items.forEach(({ link, target }) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToTarget(target);
        // set focus for accessibility
        link.focus({ preventScroll: true });
        // small UX: mark active immediately on click
        setActiveById(target ? target.id : null);
      });
    });

    // Keyboard navigation: left/right arrows move between quicknav links
    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (!active || !active.classList.contains('navlink')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusNext(active, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        focusNext(active, -1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        // allow Enter / Space to activate
        e.preventDefault();
        active.click();
      }
    });

    function focusNext(el, dir) {
      const idx = links.indexOf(el);
      if (idx === -1) return;
      let next = (idx + dir + links.length) % links.length;
      links[next].focus();
    }

    // Active highlight logic — use IntersectionObserver for accurate results
    const observedTargets = items.map(it => it.target).filter(Boolean);
    let activeId = null;

    if (observedTargets.length) {
      const io = new IntersectionObserver(entries => {
        // choose the entry closest to top and visible
        const visible = entries
          .filter(en => en.isIntersecting)
          .sort((a,b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        if (visible.length) {
          const topId = visible[0].target.id;
          setActiveById(topId);
        }
      }, {
        root: null,
        rootMargin: '0px 0px -40% 0px', // consider section active when it's ~60% in view
        threshold: [0, 0.1, 0.5, 0.9]
      });

      observedTargets.forEach(t => io.observe(t));
    } else {
      // If there are no real targets, still allow click-based active states (anchors used only as ids)
      // Setup a scroll listener fallback: set active based on scrollY and element positions (if any invisible anchors exist)
      window.addEventListener('scroll', throttle(updateActiveFallback, 150));
      updateActiveFallback();
    }

    function updateActiveFallback() {
      let cur = null;
      items.forEach(it => {
        if (!it.target) return;
        if (window.scrollY >= it.target.offsetTop - (window.innerHeight / 2)) cur = it.id;
      });
      setActiveById(cur);
    }

    function setActiveById(id) {
      if (activeId === id) return;
      activeId = id;
      items.forEach(it => {
        const isActive = it.id === id;
        it.link.classList.toggle('active', isActive);
        it.link.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }

    // Utility: throttle function
    function throttle(fn, wait) {
      let last = 0, timer = null;
      return function (...args) {
        const now = Date.now();
        const remaining = wait - (now - last);
        if (remaining <= 0) {
          if (timer) { clearTimeout(timer); timer = null; }
          last = now;
          fn.apply(this, args);
        } else if (!timer) {
          timer = setTimeout(() => {
            last = Date.now();
            timer = null;
            fn.apply(this, args);
          }, remaining);
        }
      };
    }

    // Initialize active class based on current scroll position
    setTimeout(() => {
      // if any target in view, IntersectionObserver will set it; otherwise fallback
      updateActiveFallback();
    }, 60);
  });
})();
