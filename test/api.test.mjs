// End-to-end API test against a running `npm run dev` (default http://localhost:8787).
// Usage: npm test            (reads ADMIN_KEY from .dev.vars)
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.env.BASE || "http://localhost:8787";
const KEY = process.env.ADMIN_KEY || readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").match(/ADMIN_KEY=(\S+)/)[1];

async function call(method, path, body, { auth = true, raw = false } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: { ...(auth ? { authorization: "Bearer " + KEY } : {}), ...(body && !raw ? { "content-type": "application/json" } : {}) },
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

let passed = 0;
const step = async (name, fn) => { await fn(); passed++; console.log("  ✓", name); };

console.log(`API tests against ${BASE}`);

await step("public site and admin page are served", async () => {
  assert.equal((await call("GET", "/", null, { auth: false })).status, 200);
  assert.equal((await call("GET", "/admin/", null, { auth: false })).status, 200);
});

await step("every page in the site tree is served, and its links resolve", async () => {
  const pages = ["/", "/services/", "/services/interior/", "/services/exterior/", "/services/cabinets/",
    "/services/wall-repair/", "/services/waterproofing/", "/services/commercial/", "/work/", "/about/", "/contact/", "/faq/", "/reviews/", "/privacy/"];
  const linked = new Set();
  for (const p of pages) {
    const r = await fetch(BASE + p, { redirect: "manual" });
    assert.equal(r.status, 200, p);
    for (const m of (await r.text()).matchAll(/href="(\/[^"#?]*)/g)) linked.add(m[1]);
  }
  for (const p of linked) {
    if (p.startsWith("/admin")) continue;
    const r = await fetch(BASE + p, { redirect: "manual" });
    assert.ok(r.status === 200, `${p} → ${r.status}`);
  }
  const sitemap = await (await fetch(BASE + "/sitemap.xml")).text();
  for (const p of pages) assert.ok(sitemap.includes(p + "</loc>"), "sitemap has " + p);
});

await step("unknown pages get the 404 page; every page has share tags and Google data", async () => {
  const r = await fetch(BASE + "/no-such-page/", { redirect: "manual" });
  assert.equal(r.status, 404);
  assert.match(await r.text(), /that page isn't here/);
  const home = await (await fetch(BASE + "/")).text();
  assert.match(home, /"@type": "HousePainter"/);
  assert.match(home, /property="og:image" content="https:\/\/[^"]+\.jpg"/);
  const svc = await (await fetch(BASE + "/services/exterior/")).text();
  assert.match(svc, /"@type": "Service"/);
  assert.match(svc, /"@type": "BreadcrumbList"/);
  assert.equal((await fetch(BASE + "/privacy/")).status, 200);
});

await step("visitor counter: counts pages, ignores bots and junk, admin-only stats", async () => {
  const hit = (body, ua = "Mozilla/5.0 test") => fetch(BASE + "/api/hit", { method: "POST", body: JSON.stringify(body), headers: { "user-agent": ua } });
  const before = (await call("GET", "/api/admin/stats?days=1")).data;
  const count = (s, p) => (s.by_path.find((x) => x.path === p) || { views: 0 }).views;
  assert.equal((await hit({ p: "/services/exterior/", r: "https://www.google.com/search", l: "es" })).status, 204);
  await hit({ p: "/services/exterior/", r: "" }, "Googlebot/2.1");       // bot: ignored
  await hit({ p: "/admin/", r: "" });                                     // admin: ignored
  await hit({ p: "<script>", r: "" });                                    // junk path: ignored
  const after = (await call("GET", "/api/admin/stats?days=1")).data;
  assert.equal(count(after, "/services/exterior/"), count(before, "/services/exterior/") + 1);
  assert.equal(count(after, "/admin/"), 0);
  assert.ok(after.by_ref.some((x) => x.ref === "google.com"));
  assert.ok(after.by_lang.some((x) => x.lang === "es"));
  assert.equal((await call("GET", "/api/admin/stats", null, { auth: false })).status, 401);
});

await step("admin routes reject missing / wrong key", async () => {
  assert.equal((await call("GET", "/api/admin/jobs", null, { auth: false })).status, 401);
  const r = await fetch(BASE + "/api/admin/jobs", { headers: { authorization: "Bearer nope" } });
  assert.equal(r.status, 401);
});

await step("quote validation", async () => {
  assert.equal((await call("POST", "/api/quotes", { email: "a@b.co" }, { auth: false })).status, 400);
  assert.equal((await call("POST", "/api/quotes", { name: "X" }, { auth: false })).status, 400);
  assert.equal((await call("POST", "/api/quotes", { name: "X", email: "not-email" }, { auth: false })).status, 400);
});

await step("honeypot submissions are accepted but not stored", async () => {
  const before = (await call("GET", "/api/admin/quotes")).data.length;
  const r = await call("POST", "/api/quotes", { name: "Bot", email: "bot@x.io", website: "spam.example" }, { auth: false });
  assert.equal(r.status, 200);
  assert.equal((await call("GET", "/api/admin/quotes")).data.length, before);
});

await step("no-JS form POST redirects back with ?sent=1", async () => {
  const form = new URLSearchParams({ name: "Form Person", phone: "555-0100", scope: "exterior" });
  const r = await fetch(BASE + "/api/quotes", { method: "POST", body: form, redirect: "manual" });
  assert.equal(r.status, 303);
  assert.match(r.headers.get("location"), /\/contact\/\?sent=1#quote$/);
});

await step("Spanish quotes keep their language", async () => {
  const r = await call("POST", "/api/quotes", { name: "Cliente Prueba", phone: "555-0101", lang: "es" }, { auth: false });
  assert.equal(r.status, 201);
  const q = (await call("GET", "/api/admin/quotes")).data.find((x) => x.id === r.data.id);
  assert.equal(q.lang, "es");
  const form = new URLSearchParams({ name: "Forma", phone: "555-0102", lang: "es" });
  const f = await fetch(BASE + "/api/quotes", { method: "POST", body: form, redirect: "manual" });
  assert.match(f.headers.get("location"), /\?sent=1&lang=es#quote$/);
  const job = (await call("POST", `/api/admin/quotes/${r.data.id}/convert`)).data;
  assert.match(job.notes, /Spanish/);
  assert.equal((await call("DELETE", `/api/admin/jobs/${job.id}`)).status, 200);
});

let quoteId, job, crewA, crewB;
await step("quote → job conversion", async () => {
  const q = await call("POST", "/api/quotes", { name: "Test Client", email: "client@example.com", address: "12 Test St", scope: "interior", rooms: 3, sqft: 900, message: "Hallway too" }, { auth: false });
  assert.equal(q.status, 201);
  quoteId = q.data.id;
  const c = await call("POST", `/api/admin/quotes/${quoteId}/convert`);
  assert.equal(c.status, 201);
  job = c.data;
  assert.match(job.ref, /^JP-\d{4}$/);
  assert.equal(job.status, "lead");
  assert.match(job.notes, /3 rooms/);
  assert.equal((await call("POST", `/api/admin/quotes/${quoteId}/convert`)).status, 409);
});

let estId;
await step("estimate math and auto-advance to 'estimated'", async () => {
  const r = await call("POST", `/api/admin/jobs/${job.id}/estimates`, {
    tax_rate: 0.1,
    discount: 50,
    items: [
      { description: "Walls", kind: "area", qty: 700, rate: 2, coats: 2, coverage: 350, paint_price: 50 }, // 1400 + 4 gal*50 = 1600
      { description: "Doors", kind: "unit", qty: 3, rate: 80 },                                           // 240
      { description: "Prep", kind: "flat", qty: 99, rate: 160 },                                          // 160 (qty ignored)
    ],
  });
  assert.equal(r.status, 201);
  const e = r.data;
  estId = e.id;
  assert.equal(e.subtotal, 2000);
  assert.equal(e.tax, 195);          // (2000-50) * 0.1
  assert.equal(e.total, 2145);
  assert.equal(e.gallons, 4);
  assert.equal(e.items[2].qty, 1);
  const j = (await call("GET", `/api/admin/jobs/${job.id}`)).data;
  assert.equal(j.status, "estimated");
});

await step("estimate rejects empty items and bad kinds", async () => {
  assert.equal((await call("POST", `/api/admin/jobs/${job.id}/estimates`, { items: [] })).status, 400);
  assert.equal((await call("POST", `/api/admin/jobs/${job.id}/estimates`, { items: [{ description: "x", kind: "magic" }] })).status, 400);
});

await step("accepted estimates are locked", async () => {
  assert.equal((await call("PATCH", `/api/admin/estimates/${estId}`, { status: "accepted" })).data.status, "accepted");
  assert.equal((await call("PUT", `/api/admin/estimates/${estId}`, { items: [{ description: "x", kind: "flat", rate: 1 }] })).status, 409);
});

await step("crews", async () => {
  crewA = (await call("POST", "/api/admin/crews", { name: "Test Crew A", color: "#222222" })).data.id;
  crewB = (await call("POST", "/api/admin/crews", { name: "Test Crew B", color: "#888888" })).data.id;
  assert.equal((await call("POST", "/api/admin/crews", { name: "Bad", color: "red" })).status, 400);
});

await step("booking auto-advances to 'scheduled' and detects crew clashes", async () => {
  const b1 = await call("POST", `/api/admin/jobs/${job.id}/schedule`, { crew_id: crewA, start_date: "2030-03-04", end_date: "2030-03-06" });
  assert.equal(b1.status, 201);
  assert.equal((await call("GET", `/api/admin/jobs/${job.id}`)).data.status, "scheduled");

  const clash = await call("POST", `/api/admin/jobs/${job.id}/schedule`, { crew_id: crewA, start_date: "2030-03-06", end_date: "2030-03-07" });
  assert.equal(clash.status, 409);
  assert.equal(clash.data.conflicts.length, 1);

  assert.equal((await call("POST", `/api/admin/jobs/${job.id}/schedule`, { crew_id: crewB, start_date: "2030-03-06", end_date: "2030-03-07" })).status, 201);
  assert.equal((await call("POST", `/api/admin/jobs/${job.id}/schedule`, { crew_id: crewA, start_date: "2030-03-06", end_date: "2030-03-06", force: true })).status, 201);
  assert.equal((await call("POST", `/api/admin/jobs/${job.id}/schedule`, { start_date: "2030-03-09", end_date: "2030-03-08" })).status, 400);

  const week = (await call("GET", "/api/admin/schedule?from=2030-03-01&to=2030-03-14")).data;
  assert.equal(week.filter((b) => b.job_id === job.id).length, 3);
});

await step("board search and status moves are logged", async () => {
  const found = (await call("GET", `/api/admin/jobs?q=${encodeURIComponent(job.ref)}`)).data;
  assert.equal(found.length, 1);
  assert.equal(found[0].estimate_total, 2145);
  assert.equal((await call("PATCH", `/api/admin/jobs/${job.id}`, { status: "in_progress" })).data.status, "in_progress");
  assert.equal((await call("PATCH", `/api/admin/jobs/${job.id}`, { status: "painting" })).status, 400);
  const j = (await call("GET", `/api/admin/jobs/${job.id}`)).data;
  assert.ok(j.activity.some((a) => a.text.includes("scheduled → in_progress")));
});

await step("summary", async () => {
  const s = (await call("GET", "/api/admin/summary")).data;
  assert.ok(s.jobs.in_progress >= 1);
  assert.ok(s.pipeline_value >= 2145);
});

await step("deleting a job cascades", async () => {
  assert.equal((await call("DELETE", `/api/admin/jobs/${job.id}`)).status, 200);
  assert.equal((await call("GET", `/api/admin/estimates/${estId}`)).status, 404);
  const week = (await call("GET", "/api/admin/schedule?from=2030-03-01&to=2030-03-14")).data;
  assert.equal(week.filter((b) => b.job_id === job.id).length, 0);
  // the quote stays, unlinked from the deleted job
  const q = (await call("GET", "/api/admin/quotes?status=converted")).data.find((x) => x.id === quoteId);
  assert.equal(q.job_id, null);
});

await step("retiring crews hides them from the schedule", async () => {
  for (const id of [crewA, crewB]) assert.equal((await call("PATCH", `/api/admin/crews/${id}`, { active: false })).status, 200);
  const crews = (await call("GET", "/api/admin/crews")).data;
  assert.ok(crews.filter((c) => [crewA, crewB].includes(c.id)).every((c) => c.active === 0));
});

await step("unknown routes and methods", async () => {
  assert.equal((await call("GET", "/api/nope")).status, 404);
  assert.equal((await call("DELETE", "/api/admin/summary")).status, 405);
});

console.log(`\n${passed} checks passed`);
