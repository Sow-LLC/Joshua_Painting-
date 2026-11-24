// Quote form: submit with fetch when JS is available (the plain POST still works without it).
// Messages come from i18n.js (window.abT) so they follow the EN / ES switch.
(() => {
  const form = document.getElementById("quote-form");
  if (!form) return;
  const msg = form.querySelector(".form-msg");
  const button = form.querySelector("button[type=submit]");
  const t = (key) => (window.abT ? window.abT(key) : key);

  // Remember what is showing as keys, so switching language re-words it.
  let shown = null;
  const say = (keys, kind) => {
    shown = keys && { keys: [].concat(keys), kind };
    msg.textContent = shown ? shown.keys.map(t).join(" ") : "";
    msg.className = "form-msg " + (kind || "");
  };
  document.addEventListener("ab:lang", () => shown && say(shown.keys, shown.kind));

  const params = new URLSearchParams(location.search);
  if (params.get("sent")) say("thanks", "ok");
  // arriving from /services/ ("Get a free quote for this") preselects the type of work
  const scope = params.get("scope");
  const pick = scope && form.querySelector(`input[name=scope][value="${CSS.escape(scope)}"]`);
  if (pick) pick.checked = true;

  const invalid = (id) => form.querySelector(id).parentElement.setAttribute("aria-invalid", "true");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (!data.name.trim()) { invalid("#f-name"); return say("needName", "err"); }
    if (!data.email.trim() && !data.phone.trim()) { invalid("#f-email"); return say("needContact", "err"); }
    if (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) { invalid("#f-email"); return say("badEmail", "err"); }

    button.disabled = true;
    say("sending");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      form.reset();
      form.querySelector('input[name="lang"]').value = window.AB_LANG || "en"; // reset() would put it back to "en"
      say("thanks", "ok");
    } catch {
      say(["failed", "callUs"], "err");
    } finally {
      button.disabled = false;
    }
  });
})();
