// Scroll animations: photos pop up and sections fade in as they scroll into view.
// Off for anyone whose device asks for reduced motion, and the page works the same without JS.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const root = document.documentElement;
  // photos and cards "pop" (scale up); headings, text and lists slide up and fade in
  const POP = ".work-item, .tile, .frame, .svc-hero-photo, .about-photo, .story-photo, .area-photo";
  const RISE = "main .block-head, .promises li, .steps-list li, .stats li, .faq-list details, .rev-band p, .svc-hero-copy > *, .story-grid > div > *, .hero-actions, .layer";
  const items = [...document.querySelectorAll(`${POP}, ${RISE}`)].filter((el) => !el.closest(".hero"));
  if (!items.length) return;
  root.classList.add("rv-on");
  // stagger siblings in a row/grid so they arrive one after another
  const order = new Map();
  for (const el of items) {
    const n = order.get(el.parentElement) || 0;
    order.set(el.parentElement, n + 1);
    el.style.setProperty("--rv-delay", `${Math.min(n, 6) * 70}ms`);
    el.classList.add("rv", el.matches(POP) ? "rv-pop" : "rv-rise");
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach((el) => io.observe(el));
  // Backup for browsers that delay the observer (background tabs, some in-app browsers):
  // on load and after scrolling stops, show everything that is on or above the screen.
  let timer;
  const sweep = () => {
    for (const el of items) if (!el.classList.contains("in") && el.getBoundingClientRect().top < innerHeight * 0.95) {
      el.classList.add("in"); io.unobserve(el);
    }
  };
  addEventListener("scroll", () => { clearTimeout(timer); timer = setTimeout(sweep, 120); }, { passive: true });
  addEventListener("load", sweep, { once: true });
})();
