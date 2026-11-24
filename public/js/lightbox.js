// Full-screen photo viewer for the job photos (.work-item): tap a photo to open it,
// swipe or use ← → to move through the photos shown on the page, tap ✕ / Esc / swipe down to close.
(() => {
  const all = [...document.querySelectorAll(".work-item")];
  if (!all.length) return;
  const t = (k, en) => (window.abT && window.abT(k) !== k ? window.abT(k) : en);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  // largest file from the srcset, so the full-screen photo is sharp
  const big = (img) => {
    const set = (img.getAttribute("srcset") || "").split(",").map((s) => s.trim().split(/\s+/));
    return set.length && set[0][0] ? set.sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0][0] : img.currentSrc || img.src;
  };

  const box = document.createElement("div");
  box.className = "lb";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.innerHTML = `
    <div class="lb-top"><span class="lb-count"></span><button class="lb-x" type="button"></button></div>
    <div class="lb-stage"><img class="lb-img" alt=""></div>
    <div class="lb-bottom"><button class="lb-prev" type="button">←</button><p class="lb-cap"></p><button class="lb-next" type="button">→</button></div>`;
  document.body.appendChild(box);
  const img = box.querySelector(".lb-img");
  const cap = box.querySelector(".lb-cap");
  const count = box.querySelector(".lb-count");
  const stage = box.querySelector(".lb-stage");
  const [x, prev, next] = [".lb-x", ".lb-prev", ".lb-next"].map((s) => box.querySelector(s));

  let list = [], i = 0, opener = null;
  const label = () => {
    x.setAttribute("aria-label", t("lb.close", "Close"));
    prev.setAttribute("aria-label", t("lb.prev", "Previous photo"));
    next.setAttribute("aria-label", t("lb.next", "Next photo"));
  };
  const show = (n, dir = 0) => {
    i = (n + list.length) % list.length;
    const fig = list[i], src = fig.querySelector("img");
    img.src = big(src);
    cap.textContent = fig.querySelector("figcaption")?.textContent || src.alt;
    img.alt = cap.textContent;
    count.textContent = `${i + 1} / ${list.length}`;
    if (dir && !calm) { img.classList.remove("lb-from-l", "lb-from-r"); void img.offsetWidth; img.classList.add(dir > 0 ? "lb-from-r" : "lb-from-l"); }
    // fetch the neighbours so swiping is instant
    [i + 1, i - 1].forEach((k) => { const f = list[(k + list.length) % list.length]; if (f) new Image().src = big(f.querySelector("img")); });
  };
  const open = (fig) => {
    // only the photos of the same job type (the row it sits in), else every photo on the page
    const group = fig.closest(".shots");
    list = all.filter((f) => !f.hidden && f.offsetParent !== null && (!group || f.closest(".shots") === group));
    opener = fig.querySelector(".work-open");
    label();
    box.hidden = false;
    root.classList.add("lb-open");
    show(list.indexOf(fig));
    x.focus({ preventScroll: true });
  };
  const close = () => {
    box.hidden = true;
    root.classList.remove("lb-open");
    stage.style.transform = "";
    opener?.focus({ preventScroll: true });
  };

  all.forEach((fig) => {
    // a real (invisible) button over the photo, so keyboards and screen readers can open it
    const b = document.createElement("button");
    b.type = "button";
    b.className = "work-open";
    const name = () => `${t("lb.open", "Open photo")}: ${fig.querySelector("figcaption")?.textContent || fig.querySelector("img").alt}`;
    b.setAttribute("aria-label", name());
    document.addEventListener("ab:lang", () => b.setAttribute("aria-label", name()));
    fig.appendChild(b);
    fig.addEventListener("click", () => open(fig));
  });

  x.addEventListener("click", close);
  prev.addEventListener("click", () => show(i - 1, -1));
  next.addEventListener("click", () => show(i + 1, 1));
  let swiped = 0;   // a swipe also ends in a click; don't treat it as "tap outside to close"
  box.addEventListener("click", (e) => { if (Date.now() - swiped > 400 && (e.target === box || e.target === stage)) close(); });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(i + 1, 1);
    else if (e.key === "ArrowLeft") show(i - 1, -1);
    else if (e.key === "Tab") {   // keep focus inside the viewer
      const f = [x, prev, next]; const k = f.indexOf(document.activeElement);
      e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  // swipe: left / right to move, down to close; the photo follows the finger
  let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false;
  stage.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") return; dragging = true; sx = e.clientX; sy = e.clientY; dx = dy = 0; try { stage.setPointerCapture(e.pointerId); } catch {} });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    stage.style.transform = Math.abs(dy) > Math.abs(dx) && dy > 0 ? `translateY(${dy}px)` : `translateX(${dx}px)`;
    box.style.setProperty("--lb-fade", Math.abs(dy) > Math.abs(dx) ? String(Math.max(0.4, 1 - dy / 600)) : "1");
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) swiped = Date.now();
    stage.style.transform = "";
    box.style.removeProperty("--lb-fade");
    if (dy > 110 && Math.abs(dy) > Math.abs(dx)) close();
    else if (dx < -50) show(i + 1, 1);
    else if (dx > 50) show(i - 1, -1);
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
})();
