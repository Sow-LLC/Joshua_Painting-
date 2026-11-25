// Joshua's Painting Service — studio dashboard. Vanilla JS; talks to /api/admin/* with a Bearer key.
(() => {
  const STATUSES = ["lead", "estimated", "scheduled", "in_progress", "done", "cancelled"];
  const STATUS_LABEL = { lead: "Lead", estimated: "Estimated", scheduled: "Scheduled", in_progress: "In progress", done: "Done", cancelled: "Cancelled" };
  const SCOPES = ["interior", "exterior", "cabinets", "walls", "waterproofing", "commercial", "other"];
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = (n) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // local calendar date (toISOString would give tomorrow's date on a US evening)
  const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmtDate = (s) => new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtTime = (s) => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  /** Tiny element builder. Strings become text nodes, so user data is never parsed as HTML. */
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k in el && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
    return el;
  }

  // ───── API ─────
  let key = sessionStorage.getItem("ab-key") || "";
  async function api(method, path, body) {
    const res = await fetch("/api/admin" + path, {
      method,
      headers: { authorization: "Bearer " + key, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { signOut(); throw new Error("Signed out"); }
    if (!res.ok) { const e = new Error(data.error || res.statusText); e.data = data; e.status = res.status; throw e; }
    return data;
  }

  let toastTimer;
  function toast(text, err) {
    const t = $("#toast");
    t.textContent = text;
    t.className = "toast show" + (err ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 2800);
  }
  const fail = (e) => toast(e.message, true);

  // ───── auth ─────
  function signOut() {
    key = "";
    sessionStorage.removeItem("ab-key");
    $("#app").hidden = true;
    $("#login").hidden = false;
  }
  // on a phone it's easy to mistype a hidden key, so it can be shown while typing
  $("#show-key").addEventListener("change", (e) => { $("#key").type = e.target.checked ? "text" : "password"; });
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    key = $("#key").value.trim();
    try {
      await api("GET", "/summary");
      sessionStorage.setItem("ab-key", key);
      start();
    } catch (err) {
      $("#login-err").textContent = err.message === "Signed out" ? "That key is not right." : err.message;
    }
  });
  $("#logout").addEventListener("click", signOut);

  // ───── navigation ─────
  let view = "overview";
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
  function show(v) {
    view = v;
    $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
    $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== v));
    refresh();
  }
  function refresh() {
    ({ overview: loadOverview, quotes: loadQuotes, board: loadBoard, schedule: loadSchedule, crews: loadCrews, visitors: loadVisitors })[view]().catch(fail);
    api("GET", "/summary").then((s) => ($("#pill-quotes").textContent = s.new_quotes || "")).catch(() => {});
  }

  // ───── overview ─────
  async function loadOverview() {
    const s = await api("GET", "/summary");
    const open = STATUSES.filter((x) => !["done", "cancelled"].includes(x)).reduce((n, x) => n + s.jobs[x], 0);
    $("#stats").replaceChildren(
      stat("New quotes", s.new_quotes),
      stat("Open jobs", open),
      stat("Pipeline value", money(s.pipeline_value)),
      stat("In progress", s.jobs.in_progress),
      stat("Completed", s.jobs.done),
    );
    $("#upcoming").replaceChildren(...s.upcoming.map((b) =>
      h("div", { class: "item" },
        h("h3", {}, h("span", { class: "dot", style: `background:${b.crew_color || "#fff"}` }), `${b.ref} · ${b.title}`),
        h("div", { class: "actions" }, h("button", { class: "btn btn-ghost btn-sm", onclick: () => openJob(b.job_id) }, "Open")),
        h("p", { class: "muted" }, `${fmtDate(b.start_date)}${b.end_date !== b.start_date ? " – " + fmtDate(b.end_date) : ""} · ${b.crew_name || "Unassigned"}${b.address ? " · " + b.address : ""}`),
      )));
  }
  const stat = (label, value) => h("div", { class: "stat" }, h("span", { class: "label" }, label), h("b", {}, value));

  // ───── visitors ─────
  let visitDays = 30;
  $$("#visit-range button").forEach((b) => b.addEventListener("click", () => {
    visitDays = Number(b.dataset.d);
    $$("#visit-range button").forEach((x) => x.classList.toggle("on", x === b));
    loadVisitors().catch(fail);
  }));
  async function loadVisitors() {
    const s = await api("GET", "/stats?days=" + visitDays);
    const utcDay = (offset) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10); // the server counts in UTC days
    const total = s.by_day.reduce((n, d) => n + d.views, 0);
    const es = (s.by_lang.find((l) => l.lang === "es") || { views: 0 }).views;
    const servicePages = s.by_path.filter((p) => p.path.startsWith("/services/")).reduce((n, p) => n + p.views, 0);
    $("#visit-stats").replaceChildren(
      stat(`Views, last ${s.days} days`, total),
      stat("Today", (s.by_day.find((d) => d.day === utcDay(0)) || { views: 0 }).views),
      stat("In Spanish", total ? Math.round((es / total) * 100) + "%" : "–"),
      stat("Service page views", servicePages),
    );
    // one bar per day, days without visits included
    const max = Math.max(1, ...s.by_day.map((d) => d.views));
    const byDay = Object.fromEntries(s.by_day.map((d) => [d.day, d.views]));
    const bars = [];
    for (let i = s.days - 1; i >= 0; i--) {
      const d = utcDay(i), v = byDay[d] || 0;
      bars.push(h("div", { class: "bar", title: `${fmtDate(d)}: ${v} view${v === 1 ? "" : "s"}`, style: `--h:${(v / max) * 100}%` }));
    }
    $("#visit-days").replaceChildren(...bars);
    const rows = (list, label) => list.map((r) => h("div", { class: "item" }, h("h3", {}, label(r)), h("div", { class: "actions mono" }, String(r.views))));
    $("#visit-pages").replaceChildren(...rows(s.by_path, (r) => h("a", { href: r.path, target: "_blank", rel: "noopener" }, r.path)));
    $("#visit-refs").replaceChildren(...rows(s.by_ref, (r) => r.ref));
  }

  // ───── quotes ─────
  let quoteFilter = "new";
  $$("#quote-filter button").forEach((b) => b.addEventListener("click", () => {
    quoteFilter = b.dataset.s;
    $$("#quote-filter button").forEach((x) => x.classList.toggle("on", x === b));
    loadQuotes().catch(fail);
  }));
  async function loadQuotes() {
    const list = await api("GET", "/quotes" + (quoteFilter ? "?status=" + quoteFilter : ""));
    $("#quotes").replaceChildren(...list.map((q) => {
      const actions = [];
      if (q.status === "new") {
        actions.push(
          h("button", { class: "btn btn-sm", onclick: () => convert(q.id) }, "Make job"),
          h("button", { class: "btn btn-ghost btn-sm", onclick: () => setQuote(q.id, "declined") }, "Decline"));
      } else if (q.status === "declined") {
        actions.push(h("button", { class: "btn btn-ghost btn-sm", onclick: () => setQuote(q.id, "new") }, "Restore"));
      } else if (q.job_id) {
        actions.push(h("button", { class: "btn btn-ghost btn-sm", onclick: () => openJob(q.job_id) }, "Open job"));
      }
      const facts = [q.lang === "es" ? "ES · Spanish" : null, q.scope, q.rooms && `${q.rooms} rooms`, q.sqft && `${q.sqft} sq ft`, q.timeline].filter(Boolean).join(" · ");
      return h("div", { class: "item" },
        h("h3", {}, q.name, " ", h("span", { class: "mono" }, fmtTime(q.created_at))),
        h("div", { class: "actions" }, actions),
        h("p", {}, [q.email, q.phone, q.address].filter(Boolean).join(" · ")),
        h("p", { class: "muted" }, facts),
        q.message ? h("p", {}, q.message) : null);
    }));
  }
  async function convert(id) {
    try {
      const job = await api("POST", `/quotes/${id}/convert`);
      toast(`Job ${job.ref} created`);
      refresh();
      openJob(job.id);
    } catch (e) { fail(e); }
  }
  async function setQuote(id, status) {
    try { await api("PATCH", `/quotes/${id}`, { status }); refresh(); } catch (e) { fail(e); }
  }

  // ───── board ─────
  let boardQ = "";
  let searchTimer;
  $("#board-q").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { boardQ = e.target.value.trim(); loadBoard().catch(fail); }, 250);
  });
  $("#new-job").addEventListener("click", () => openNewJob());

  async function loadBoard() {
    const jobs = await api("GET", "/jobs" + (boardQ ? "?q=" + encodeURIComponent(boardQ) : ""));
    $("#board").replaceChildren(...STATUSES.map((s) => {
      const mine = jobs.filter((j) => j.status === s);
      const col = h("div", { class: "col", "data-status": s },
        h("div", { class: "col-h" }, h("span", {}, STATUS_LABEL[s]), h("span", {}, mine.length)),
        ...mine.map(card));
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", () => col.classList.remove("over"));
      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        col.classList.remove("over");
        const id = e.dataTransfer.getData("text/plain");
        const job = jobs.find((j) => j.id === id);
        if (!job || job.status === s) return;
        try { await api("PATCH", `/jobs/${id}`, { status: s }); toast(`${job.ref} → ${STATUS_LABEL[s]}`); loadBoard().catch(fail); } catch (err) { fail(err); }
      });
      return col;
    }));
  }
  function card(j) {
    const el = h("div", { class: "card", draggable: "true", onclick: () => openJob(j.id) },
      h("div", { class: "ref" }, j.ref),
      h("h4", {}, j.title),
      h("div", { class: "meta" },
        h("span", {}, j.client_name),
        h("span", {}, j.estimate_total != null ? money(j.estimate_total) : j.next_date ? fmtDate(j.next_date) : "")));
    el.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", j.id); el.classList.add("dragging"); });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
    return el;
  }

  // ───── schedule (two-week grid by crew) ─────
  let weekStart = mondayOf(new Date());
  function mondayOf(d) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  $("#wk-prev").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() - 7); loadSchedule().catch(fail); });
  $("#wk-next").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() + 7); loadSchedule().catch(fail); });

  async function loadSchedule() {
    const days = [...Array(14)].map((_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
    const from = day(days[0]), to = day(days[13]), today = day(new Date());
    $("#wk-label").textContent = `${fmtDate(from)} – ${fmtDate(to)}`;
    const [bookings, crews] = await Promise.all([api("GET", `/schedule?from=${from}&to=${to}`), api("GET", "/crews")]);
    const rows = [...crews.filter((c) => c.active), { id: null, name: "Unassigned", color: "#9a958c" }];
    const cal = $("#calendar");
    cal.style.gridTemplateColumns = `140px repeat(14, minmax(84px, 1fr))`;
    const cells = [h("div", { class: "ch" }, "Crew")];
    for (const d of days) cells.push(h("div", { class: "ch" + (day(d) === today ? " today" : "") }, d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })));
    for (const crew of rows) {
      cells.push(h("div", { class: "crew" }, h("span", { class: "dot", style: `background:${crew.color}` }), crew.name));
      for (const d of days) {
        const ds = day(d);
        const here = bookings.filter((b) => (b.crew_id || null) === crew.id && b.start_date <= ds && b.end_date >= ds);
        const wk = d.getDay() === 0 || d.getDay() === 6;
        cells.push(h("div", { class: wk ? "weekend" : "" }, ...here.map((b) =>
          h("button", { class: "bk", style: `background:${crew.color}`, title: `${b.ref} ${b.title}${b.note ? " — " + b.note : ""}`, onclick: () => openJob(b.job_id) }, `${b.ref} ${b.title}`))));
      }
    }
    cal.replaceChildren(...cells);
  }

  // ───── crews ─────
  async function loadCrews() {
    const crews = await api("GET", "/crews");
    $("#crews").replaceChildren(...crews.map((c) =>
      h("div", { class: "item" },
        h("h3", { style: c.active ? "" : "opacity:.5" }, h("span", { class: "dot", style: `background:${c.color}` }), c.name),
        h("div", { class: "actions" },
          h("button", { class: "btn btn-ghost btn-sm", onclick: async () => { try { await api("PATCH", `/crews/${c.id}`, { active: !c.active }); loadCrews(); } catch (e) { fail(e); } } }, c.active ? "Retire" : "Reactivate")),
        h("p", { class: "muted" }, [c.lead, c.phone].filter(Boolean).join(" · ") || "—"))));
  }
  $("#crew-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("POST", "/crews", Object.fromEntries(new FormData(e.target)));
      e.target.reset();
      loadCrews();
      toast("Crew added");
    } catch (err) { fail(err); }
  });

  // ───── drawer ─────
  const drawer = $("#drawer");
  const content = $("#drawer-content");
  drawer.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closeDrawer(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) closeDrawer(); });
  function closeDrawer() { drawer.hidden = true; refresh(); }
  function openDrawer(...nodes) { content.replaceChildren(...nodes); drawer.hidden = false; }

  function jobForm(job = {}) {
    const field = (label, name, el, wide) => h("label", { class: wide ? "wide" : "" }, label, el || h("input", { name, value: job[name] || "" }));
    return h("form", { class: "grid2" },
      field("Title", "title", null, true),
      field("Client", "client_name"),
      field("Status", "status", h("select", { name: "status" }, STATUSES.map((s) => h("option", { value: s, selected: job.status === s }, STATUS_LABEL[s])))),
      field("Email", "client_email"),
      field("Phone", "client_phone"),
      field("Address", "address", null, true),
      field("Scope", "scope", h("select", { name: "scope" }, h("option", { value: "" }, "—"), SCOPES.map((s) => h("option", { value: s, selected: job.scope === s }, s)))),
      h("span"),
      field("Notes", "notes", h("textarea", { name: "notes", rows: 4 }, job.notes || ""), true));
  }

  function openNewJob() {
    const form = jobForm({ status: "lead" });
    form.append(h("div", { class: "wide row" }, h("button", { class: "btn" }, "Create job")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const job = await api("POST", "/jobs", Object.fromEntries(new FormData(form)));
        toast(`Job ${job.ref} created`);
        openJob(job.id);
      } catch (err) { fail(err); }
    });
    openDrawer(h("p", { class: "label" }, "New job"), h("h1", { id: "dr-title" }, "Add a job"), h("div", { class: "dr-section" }, form));
  }

  async function openJob(id) {
    let job, crews;
    try { [job, crews] = await Promise.all([api("GET", `/jobs/${id}`), api("GET", "/crews")]); } catch (e) { return fail(e); }

    const form = jobForm(job);
    form.append(h("div", { class: "wide row" },
      h("button", { class: "btn" }, "Save"),
      h("button", { type: "button", class: "btn btn-danger", onclick: async () => {
        if (!confirm(`Delete ${job.ref} and all its estimates and bookings? This cannot be undone.`)) return;
        try { await api("DELETE", `/jobs/${id}`); toast(`${job.ref} deleted`); closeDrawer(); } catch (e) { fail(e); }
      } }, "Delete job")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await api("PATCH", `/jobs/${id}`, Object.fromEntries(new FormData(form))); toast("Saved"); openJob(id); } catch (err) { fail(err); }
    });

    openDrawer(
      h("p", { class: "label" }, `${job.ref} · ${STATUS_LABEL[job.status]}`),
      h("h1", { id: "dr-title" }, job.title),
      h("div", { class: "dr-section" }, form),
      h("div", { class: "dr-section" },
        h("div", { class: "head" }, h("h2", { class: "sub", style: "margin:0" }, "Estimates"),
          h("button", { class: "btn btn-sm", onclick: (e) => e.target.closest(".dr-section").append(estimateEditor(job)) }, "New estimate")),
        ...job.estimates.map((est) => estimateView(job, est))),
      h("div", { class: "dr-section" },
        h("h2", { class: "sub" }, "Bookings"),
        h("div", { class: "list" }, ...job.schedule.map((b) =>
          h("div", { class: "item" },
            h("h3", {}, h("span", { class: "dot", style: `background:${b.crew_color || "#fff"}` }), b.crew_name || "Unassigned"),
            h("div", { class: "actions" }, h("button", { class: "btn btn-ghost btn-sm", onclick: async () => { try { await api("DELETE", `/schedule/${b.id}`); openJob(id); } catch (e) { fail(e); } } }, "Remove")),
            h("p", { class: "muted" }, `${fmtDate(b.start_date)}${b.end_date !== b.start_date ? " – " + fmtDate(b.end_date) : ""}${b.note ? " · " + b.note : ""}`)))),
        bookingForm(job, crews)),
      h("div", { class: "dr-section" },
        h("h2", { class: "sub" }, "Activity"),
        h("ul", { class: "activity" }, ...job.activity.map((a) => h("li", {}, h("time", {}, fmtTime(a.at)), a.text)))));
  }

  function bookingForm(job, crews) {
    const today = day(new Date());
    const f = h("form", { class: "inline-form" },
      h("select", { name: "crew_id" }, h("option", { value: "" }, "Unassigned"), crews.filter((c) => c.active).map((c) => h("option", { value: c.id }, c.name))),
      h("input", { type: "date", name: "start_date", value: today, required: true }),
      h("input", { type: "date", name: "end_date", value: today, required: true }),
      h("input", { name: "note", placeholder: "Note (prep, coat 2…)" }),
      h("button", { class: "btn" }, "Book"));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(f));
      try {
        await api("POST", `/jobs/${job.id}/schedule`, body);
      } catch (err) {
        if (err.status !== 409 || !err.data.conflicts) return fail(err);
        const list = err.data.conflicts.map((c) => `${c.ref} ${c.title} (${c.start_date} → ${c.end_date})`).join("\n");
        if (!confirm(`${err.message}:\n\n${list}\n\nDouble-book anyway?`)) return;
        try { await api("POST", `/jobs/${job.id}/schedule`, { ...body, force: true }); } catch (e2) { return fail(e2); }
      }
      toast("Booked");
      openJob(job.id);
    });
    return f;
  }

  // ───── estimates ─────
  function estimateView(job, est) {
    const box = h("div", { class: "est" },
      h("div", { class: "est-h" },
        h("div", {}, h("span", { class: "badge " + est.status }, est.status), " ", h("span", { class: "mono" }, fmtTime(est.created_at))),
        h("div", { class: "row no-print" },
          h("select", { onchange: async (e) => { try { await api("PATCH", `/estimates/${est.id}`, { status: e.target.value }); toast(`Marked ${e.target.value}`); openJob(job.id); } catch (err) { fail(err); } } },
            ["draft", "sent", "accepted", "rejected"].map((s) => h("option", { value: s, selected: est.status === s }, s))),
          est.status !== "accepted" ? h("button", { class: "btn btn-ghost btn-sm", onclick: () => box.replaceWith(estimateEditor(job, est)) }, "Edit") : null,
          h("button", { class: "btn btn-ghost btn-sm", onclick: () => printEstimate(box) }, "Print"),
          h("button", { class: "btn btn-danger btn-sm", onclick: async () => {
            if (!confirm("Delete this estimate?")) return;
            try { await api("DELETE", `/estimates/${est.id}`); openJob(job.id); } catch (e) { fail(e); }
          } }, "Delete"))),
      h("div", { class: "print-only-head" }, h("p", { class: "label" }, `Joshua's Painting Service · Estimate for ${job.ref}`), h("p", {}, `${job.client_name}${job.address ? " · " + job.address : ""}`)),
      h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Item"), h("th", { class: "n" }, "Qty"), h("th", { class: "n" }, "Rate"), h("th", { class: "n" }, "Paint"), h("th", { class: "n" }, "Amount"))),
        h("tbody", {}, est.items.map((i) => h("tr", {},
          h("td", {}, i.description),
          h("td", { class: "n" }, i.kind === "flat" ? "—" : `${i.qty}${i.kind === "area" ? " ft²" : ""}`),
          h("td", { class: "n" }, i.kind === "area" ? `${money(i.rate)}/ft²` : money(i.rate)),
          h("td", { class: "n" }, i.kind === "area" ? `${i.gallons} gal · ${i.coats}×` : ""),
          h("td", { class: "n" }, money(i.amount)))))),
      totals(est),
      est.notes ? h("p", { class: "muted" }, est.notes) : null);
    return box;
  }

  function totals(t) {
    return h("div", { class: "totals" },
      h("span", {}, "Subtotal"), h("span", {}, money(t.subtotal)),
      t.discount ? [h("span", {}, "Discount"), h("span", {}, "−" + money(t.discount))] : null,
      h("span", {}, `Tax ${(t.tax_rate * 100).toFixed(2)}%`), h("span", {}, money(t.tax)),
      h("span", {}, "Paint needed"), h("span", {}, `${Math.ceil(t.gallons || 0)} gal`),
      h("span", { class: "grand" }, "Total"), h("span", { class: "grand" }, money(t.total)));
  }

  function printEstimate(box) {
    box.classList.add("printing");
    window.print();
    box.classList.remove("printing");
  }

  /** Same arithmetic as the Worker's priceEstimate, for a live preview while editing. */
  function calc(items, taxRate, discount) {
    const priced = items.map((i) => {
      const qty = +i.qty || 0, rate = +i.rate || 0, coats = +i.coats || 2, cov = +i.coverage || 350, pp = +i.paint_price || 0;
      if (i.kind === "area") { const g = (qty * coats) / cov; return { amount: qty * rate + g * pp, gallons: g }; }
      if (i.kind === "unit") return { amount: qty * rate, gallons: 0 };
      return { amount: rate, gallons: 0 };
    });
    const subtotal = priced.reduce((s, p) => s + Math.round(p.amount * 100) / 100, 0);
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * taxRate * 100) / 100;
    return { priced, subtotal, discount, tax_rate: taxRate, tax, total: taxable + tax, gallons: priced.reduce((s, p) => s + p.gallons, 0) };
  }

  const PRESETS = [
    { description: "Walls — 2 coats", kind: "area", qty: 400, rate: 2.4, coats: 2, coverage: 350, paint_price: 52 },
    { description: "Ceiling — 1 coat", kind: "area", qty: 150, rate: 1.6, coats: 1, coverage: 350, paint_price: 38 },
    { description: "Doors", kind: "unit", qty: 4, rate: 85 },
    { description: "Prep, patch & protect", kind: "flat", rate: 250 },
  ];

  function estimateEditor(job, est) {
    let items = est ? est.items.map((i) => ({ ...i })) : [{ ...PRESETS[0] }];
    const tax = h("input", { type: "number", step: "0.01", min: 0, max: 50, value: est ? +(est.tax_rate * 100).toFixed(3) : 0, style: "width:80px" });
    const disc = h("input", { type: "number", step: "1", min: 0, value: est ? est.discount : 0, style: "width:100px" });
    const notes = h("textarea", { rows: 2, placeholder: "Notes shown on the estimate", style: "width:100%" }, est?.notes || "");
    const body = h("tbody");
    const totalsBox = h("div");

    const update = () => {
      const t = calc(items, (+tax.value || 0) / 100, +disc.value || 0);
      $$("tr", body).forEach((tr, i) => ($(".amt", tr).textContent = money(t.priced[i].amount)));
      totalsBox.replaceChildren(totals(t));
    };
    tax.addEventListener("input", update);
    disc.addEventListener("input", update);
    const cell = (item, k, attrs = {}) => h("td", {}, h("input", {
      value: item[k] ?? "", ...attrs, oninput: (e) => { item[k] = e.target.value; update(); },
    }));
    const render = () => {
      body.replaceChildren(...items.map((item, idx) => {
        const area = item.kind === "area";
        return h("tr", {},
          cell(item, "description", { placeholder: "Description" }),
          h("td", {}, h("select", { onchange: (e) => { item.kind = e.target.value; render(); } },
            ["area", "unit", "flat"].map((k) => h("option", { value: k, selected: item.kind === k }, k)))),
          item.kind === "flat" ? h("td", {}, "") : cell(item, "qty", { type: "number", min: 0, step: "any", style: "width:80px" }),
          cell(item, "rate", { type: "number", min: 0, step: "0.01", style: "width:80px" }),
          area ? cell(item, "coats", { type: "number", min: 1, max: 6, style: "width:50px" }) : h("td"),
          area ? cell(item, "paint_price", { type: "number", min: 0, step: "0.01", style: "width:70px", title: "$ per gallon" }) : h("td"),
          h("td", { class: "n amt" }),
          h("td", {}, h("button", { type: "button", class: "link", onclick: () => { items.splice(idx, 1); render(); } }, "×")));
      }));
      update();
    };

    const save = async () => {
      const payload = {
        tax_rate: (+tax.value || 0) / 100,
        discount: +disc.value || 0,
        notes: notes.value,
        items: items.map(({ description, kind, qty, rate, coats, coverage, paint_price }) => ({ description, kind, qty, rate, coats, coverage, paint_price })),
      };
      try {
        if (est) await api("PUT", `/estimates/${est.id}`, payload);
        else await api("POST", `/jobs/${job.id}/estimates`, payload);
        toast("Estimate saved");
        openJob(job.id);
      } catch (e) { fail(e); }
    };

    render();
    return h("div", { class: "est" },
      h("div", { class: "est-h" }, h("b", {}, est ? "Edit estimate" : "New estimate"),
        h("div", { class: "row" }, h("span", { class: "muted" }, "Add:"),
          PRESETS.map((p) => h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { items.push({ ...p }); render(); } }, p.description.split(" ")[0])))),
      h("table", {},
        h("thead", {}, h("tr", {}, ["Item", "Kind", "Qty / ft²", "Rate", "Coats", "$/gal", "Amount", ""].map((t, i) => h("th", { class: i === 6 ? "n" : "" }, t)))),
        body),
      h("div", { class: "row", style: "margin-top:10px" },
        h("label", { class: "muted" }, "Tax % ", tax), h("label", { class: "muted" }, "Discount $ ", disc)),
      totalsBox,
      h("div", { style: "margin-top:10px" }, notes),
      h("div", { class: "row", style: "margin-top:10px" },
        h("button", { class: "btn", onclick: save }, "Save estimate"),
        h("button", { class: "btn btn-ghost", onclick: () => openJob(job.id) }, "Cancel")));
  }

  // ───── boot ─────
  function start() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    show(view);
  }
  if (key) start(); else signOut();
})();
