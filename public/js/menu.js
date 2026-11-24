// Old links to home-page sections (/#quote, /#faq …) go to the pages those sections moved to.
(() => {
  if (location.pathname !== "/") return;
  const to = { "#quote": "/contact/", "#estimate": "/contact/", "#faq": "/faq/", "#about": "/about/",
               "#reviews": "/reviews/", "#work": "/work/", "#services": "/services/" }[location.hash];
  if (to) location.replace(to + location.search);
})();

// Phone menu: the ☰ button in the header opens a panel with every section.
// Hidden on wider screens, where the links sit in the header itself.
(() => {
  const btn = document.querySelector(".menu-btn");
  const panel = document.getElementById("menu");
  if (!btn || !panel) return;
  const top = btn.closest(".top");

  const set = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    top.classList.toggle("open", open);
  };
  btn.addEventListener("click", () => set(panel.hidden));
  panel.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { set(false); btn.focus(); } });
  document.addEventListener("click", (e) => { if (!panel.hidden && !top.contains(e.target)) set(false); });
  matchMedia("(min-width: 621px)").addEventListener("change", (m) => { if (m.matches) set(false); });
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
