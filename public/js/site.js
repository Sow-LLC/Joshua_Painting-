// Quote form, step by step: 1 the job → 2 details (optional) → 3 contact → thank-you screen.
// Without JS the same form shows all at once and posts normally. Messages come from
// i18n.js (window.abT) so they follow the EN / ES switch.
(() => {
  const form = document.getElementById("quote-form");
  if (!form) return;
  const msg = form.querySelector(".form-msg");
  const send = form.querySelector(".step-send");
  const next = form.querySelector(".step-next");
  const back = form.querySelector(".step-back");
  const bar = form.querySelector(".step-bar");
  const now = form.querySelector(".step-now");
  const steps = [...form.querySelectorAll(".step")];
  const done = form.parentElement.querySelector(".quote-done");
  const t = (key) => (window.abT ? window.abT(key) : key);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Remember what is showing as keys, so switching language re-words it.
  let shown = null;
  const say = (keys, kind) => {
    shown = keys && { keys: [].concat(keys), kind };
    msg.textContent = shown ? shown.keys.map(t).join(" ") : "";
    msg.className = "form-msg " + (kind || "");
  };
  document.addEventListener("ab:lang", () => shown && say(shown.keys, shown.kind));

  // ── steps ──
  let at = 0;
  form.classList.add("stepped");
  bar.hidden = false;
  const go = (i, focus = true) => {
    at = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, n) => { s.hidden = n !== at; s.classList.toggle("step-in", n === at); });
    now.textContent = at + 1;
    bar.style.setProperty("--done", `${((at + 1) / steps.length) * 100}%`);
    back.hidden = at === 0;
    next.hidden = at === steps.length - 1 || at === 0;   // step 1 moves on as soon as a job is picked
    send.hidden = at !== steps.length - 1;
    say(null);
    if (!focus) return;
    // keep the top of the form in view, then put the cursor in the first box (not on phones' step 1)
    const top = form.getBoundingClientRect().top;
    if (top < 70 || top > innerHeight * 0.5) form.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    const first = steps[at].querySelector("input:not([type=radio]), textarea");
    if (first && at === steps.length - 1) setTimeout(() => first.focus({ preventScroll: true }), 250);
  };
  next.addEventListener("click", () => go(at + 1));
  back.addEventListener("click", () => go(at - 1));

  // step 1: tapping a job moves straight on (keyboard arrows only change the choice)
  let pressed = 0;
  steps[0].addEventListener("pointerdown", () => { pressed = Date.now(); });
  steps[0].addEventListener("click", (e) => {
    if (e.target.matches("input[type=radio]") && Date.now() - pressed < 1500) setTimeout(() => go(1), 180);
  });
  steps[0].addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(1); } });
  // Enter in step 2 goes to the next step instead of sending
  steps[1].addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); go(2); } });

  // arriving from a service page (?scope=…) picks the job and starts at step 2
  const params = new URLSearchParams(location.search);
  const scope = params.get("scope");
  const pick = scope && form.querySelector(`input[name=scope][value="${CSS.escape(scope)}"]`);
  if (pick) pick.checked = true;
  // on a service page the job is already ticked in the page, so start at the details
  go(form.querySelector("input[name=scope]:checked") ? 1 : 0, false);

  const finish = (name) => {
    form.hidden = true;
    done.querySelector(".done-name").textContent = name ? `, ${name.split(" ")[0]}` : "";
    done.hidden = false;
    done.focus({ preventScroll: true });
    done.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
  };
  if (params.get("sent")) finish("");   // the no-JS post comes back here

  // ── send ──
  const invalid = (id) => form.querySelector(id).parentElement.setAttribute("aria-invalid", "true");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (at !== steps.length - 1) return go(at + 1);
    const data = Object.fromEntries(new FormData(form).entries());

    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (!data.name.trim()) { invalid("#f-name"); return say("needName", "err"); }
    if (!data.email.trim() && !data.phone.trim()) { invalid("#f-phone"); return say("needContact", "err"); }
    if (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) { invalid("#f-email"); return say("badEmail", "err"); }

    send.disabled = true;
    say("sending");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 429) return say("tooMany", "err");
      if (!res.ok) throw new Error();
      form.reset();
      form.querySelector('input[name="lang"]').value = window.AB_LANG || "en"; // reset() would put it back to "en"
      finish(data.name.trim());
    } catch {
      say(["failed", "callUs"], "err");
    } finally {
      send.disabled = false;
    }
  });
})();
