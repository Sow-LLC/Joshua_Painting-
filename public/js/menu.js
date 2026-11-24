// Old links to home-page sections (/#quote, /#faq …) go to the pages those sections moved to.
(() => {
  if (location.pathname !== "/") return;
  const to = { "#quote": "/contact/", "#estimate": "/contact/", "#faq": "/faq/", "#about": "/about/",
               "#reviews": "/reviews/", "#work": "/work/", "#services": "/services/" }[location.hash];
  if (to) location.replace(to + location.search);
})();

// Phone menu: the ☰ button opens a full-screen panel under the header (the call / quote bar
// stays visible below it). The page behind is locked while it is open. Hidden on wider screens.
(() => {
  const btn = document.querySelector(".menu-btn");
  const panel = document.getElementById("menu");
  if (!btn || !panel) return;
  const top = btn.closest(".top");
  const root = document.documentElement;
  const expand = panel.querySelector(".menu-expand");
  const sub = panel.querySelector(".menu-sub");

  const set = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    if (open) panel.style.setProperty("--menu-top", `${Math.round(top.getBoundingClientRect().bottom)}px`);
    panel.hidden = !open;
    top.classList.toggle("open", open);
    root.classList.toggle("menu-open", open);
  };
  btn.addEventListener("click", () => set(panel.hidden));
  panel.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  expand?.addEventListener("click", () => {
    const open = expand.getAttribute("aria-expanded") !== "true";
    expand.setAttribute("aria-expanded", String(open));
    sub.hidden = !open;
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { set(false); btn.focus(); } });
  matchMedia("(min-width: 821px)").addEventListener("change", (m) => { if (m.matches) set(false); });
})();

// Desktop "Services ▾" dropdown: opens on hover / keyboard focus (CSS), and on click of ▾ for touch screens.
(() => {
  const drop = document.querySelector(".drop");
  if (!drop) return;
  const btn = drop.querySelector(".drop-btn");
  const set = (open) => { drop.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open)); };
  btn.addEventListener("click", () => set(!drop.classList.contains("open")));
  document.addEventListener("click", (e) => { if (!drop.contains(e.target)) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drop.classList.contains("open")) { set(false); btn.focus(); } });
})();

// Visitor count for the job manager's Visitors tab: page, referring site and language only.
// No cookies, nothing stored in the browser, no personal data.
(() => {
  if (navigator.webdriver || location.hostname === "localhost" && !/count=1/.test(location.search)) return;
  const send = () => {
    const body = JSON.stringify({ p: location.pathname, r: document.referrer, l: window.AB_LANG || "en" });
    if (!(navigator.sendBeacon && navigator.sendBeacon("/api/hit", body))) fetch("/api/hit", { method: "POST", body, keepalive: true }).catch(() => {});
  };
  if (document.readyState === "complete") send(); else addEventListener("load", send, { once: true });
})();

// Phones and tablets: the header slides away while you scroll down and comes back
// the moment you scroll up (more room for the page, like an app). Never while the menu is open.
(() => {
  const top = document.querySelector(".top");
  if (!top) return;
  const small = matchMedia("(max-width: 820px)");
  let last = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY, d = y - last;
    if (!small.matches || top.classList.contains("open") || y < 120) top.classList.remove("hide");
    else if (d > 6) top.classList.add("hide");
    else if (d < -6) top.classList.remove("hide");
    if (Math.abs(d) > 6) last = y;
  }, { passive: true });
  // jumping to a section by link (e.g. #quote) should not leave the header hidden over it
  document.addEventListener("focusin", (e) => { if (top.contains(e.target)) top.classList.remove("hide"); });
})();
