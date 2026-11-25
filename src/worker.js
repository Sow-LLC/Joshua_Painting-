/**
 * Joshua Painting JM & Waterproofing — painting job manager API (Cloudflare Worker + D1).
 *
 * Public
 *   POST /api/quotes                     quote request (JSON or HTML form; honeypot "website")
 *   GET  /api/health
 *
 * Admin (Authorization: Bearer <ADMIN_KEY>)
 *   GET    /api/admin/summary                  dashboard numbers
 *   GET    /api/admin/quotes?status=           list quote requests
 *   PATCH  /api/admin/quotes/:id               { status: new|declined }
 *   POST   /api/admin/quotes/:id/convert       quote → job on the board
 *   GET    /api/admin/jobs?status=&q=          board
 *   POST   /api/admin/jobs                     create job
 *   GET    /api/admin/jobs/:id                 job + estimates + schedule + activity
 *   PATCH  /api/admin/jobs/:id                 edit fields / move status
 *   DELETE /api/admin/jobs/:id
 *   POST   /api/admin/jobs/:id/estimates       { tax_rate, discount, notes, items: [...] }
 *   GET    /api/admin/estimates/:id
 *   PUT    /api/admin/estimates/:id            replace fields + items
 *   PATCH  /api/admin/estimates/:id            { status: draft|sent|accepted|rejected }
 *   DELETE /api/admin/estimates/:id
 *   POST   /api/admin/jobs/:id/schedule        { crew_id, start_date, end_date, note, force? }
 *   DELETE /api/admin/schedule/:id
 *   GET    /api/admin/schedule?from=&to=       bookings in a date window
 *   GET    /api/admin/crews                    POST /api/admin/crews   PATCH /api/admin/crews/:id
 *
 * Everything else is served from ./public by the ASSETS binding.
 */

const JOB_STATUSES = ["lead", "estimated", "scheduled", "in_progress", "done", "cancelled"];
const EST_STATUSES = ["draft", "sent", "accepted", "rejected"];
const SCOPES = ["interior", "exterior", "cabinets", "walls", "waterproofing", "commercial", "other"];
const MAX_FIELD = 4000;

// ───────────────────────────── helpers ─────────────────────────────

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const str = (v, max = MAX_FIELD) => {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s === "" ? null : s;
};

const num = (v, { min = -Infinity, max = Infinity, fallback = 0 } = {}) => {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new HttpError(400, `Not a number: ${v}`);
  return Math.min(max, Math.max(min, n));
};

const int = (v, opts) => {
  const n = num(v, { ...opts, fallback: opts?.fallback ?? null });
  return n == null ? null : Math.round(n);
};

const cents = (n) => Math.round(n * 100) / 100;
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

function oneOf(v, list, field) {
  if (!list.includes(v)) throw new HttpError(400, `${field} must be one of: ${list.join(", ")}`);
  return v;
}

async function readBody(req) {
  if (Number(req.headers.get("content-length") || 0) > 64 * 1024) throw new HttpError(413, "Request too large");
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      throw new HttpError(400, "Invalid JSON");
    }
  }
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  throw new HttpError(415, "Send JSON or form data");
}

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function requireAdmin(req, env) {
  if (!env.ADMIN_KEY) throw new HttpError(503, "ADMIN_KEY is not configured");
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !timingSafeEqual(token, env.ADMIN_KEY)) throw new HttpError(401, "Unauthorized");
}

const logActivity = (env, jobId, text) =>
  env.DB.prepare("INSERT INTO activity (job_id, at, text) VALUES (?, ?, ?)").bind(jobId, now(), text);

async function getJobOr404(env, id) {
  const job = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
  if (!job) throw new HttpError(404, "Job not found");
  return job;
}

async function nextJobRef(env) {
  const row = await env.DB.prepare(
    "SELECT MAX(CAST(SUBSTR(ref, 4) AS INTEGER)) AS n FROM jobs WHERE ref LIKE 'JP-%'"
  ).first();
  return "JP-" + String((row?.n || 0) + 1).padStart(4, "0");
}

// ───────────────────────────── estimates ─────────────────────────────

/** Normalises one line item and computes its amount + paint gallons. */
function priceItem(raw, position) {
  const kind = raw.kind ? oneOf(raw.kind, ["area", "unit", "flat"], "item.kind") : "area";
  const description = str(raw.description, 300);
  if (!description) throw new HttpError(400, `Item ${position + 1} needs a description`);
  const rate = num(raw.rate, { min: 0, max: 1e6 });
  const coats = int(raw.coats, { min: 1, max: 6, fallback: 2 });
  const coverage = num(raw.coverage, { min: 50, max: 1000, fallback: 350 });
  const paintPrice = num(raw.paint_price, { min: 0, max: 1000 });
  let qty = num(raw.qty, { min: 0, max: 1e6 });
  let gallons = 0;
  let amount;

  if (kind === "area") {
    gallons = (qty * coats) / coverage;
    amount = qty * rate + gallons * paintPrice;
  } else if (kind === "unit") {
    amount = qty * rate;
  } else {
    qty = 1;
    amount = rate;
  }
  return {
    id: uid(),
    position,
    description,
    kind,
    qty,
    rate,
    coats,
    coverage,
    paint_price: paintPrice,
    amount: cents(amount),
    gallons: Math.round(gallons * 100) / 100,
  };
}

function priceEstimate(body) {
  if (!Array.isArray(body.items) || body.items.length === 0) throw new HttpError(400, "An estimate needs at least one item");
  if (body.items.length > 200) throw new HttpError(400, "Too many items");
  const items = body.items.map(priceItem);
  const taxRate = num(body.tax_rate, { min: 0, max: 0.5 });
  const discount = num(body.discount, { min: 0, max: 1e7 });
  const subtotal = cents(items.reduce((s, i) => s + i.amount, 0));
  const taxable = Math.max(0, subtotal - discount);
  const tax = cents(taxable * taxRate);
  return {
    items,
    tax_rate: taxRate,
    discount: cents(discount),
    subtotal,
    tax,
    total: cents(taxable + tax),
    gallons: Math.round(items.reduce((s, i) => s + i.gallons, 0) * 100) / 100,
    notes: str(body.notes),
  };
}

const insertItems = (env, estimateId, items) =>
  items.map((i) =>
    env.DB.prepare(
      `INSERT INTO estimate_items (id, estimate_id, position, description, kind, qty, rate, coats, coverage, paint_price, amount, gallons)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(i.id, estimateId, i.position, i.description, i.kind, i.qty, i.rate, i.coats, i.coverage, i.paint_price, i.amount, i.gallons)
  );

async function loadEstimate(env, id) {
  const est = await env.DB.prepare("SELECT * FROM estimates WHERE id = ?").bind(id).first();
  if (!est) throw new HttpError(404, "Estimate not found");
  const { results } = await env.DB.prepare("SELECT * FROM estimate_items WHERE estimate_id = ? ORDER BY position").bind(id).all();
  est.items = results;
  return est;
}

// ───────────────────────────── public routes ─────────────────────────────

async function createQuote(req, env, url) {
  const isForm = !(req.headers.get("content-type") || "").includes("application/json");
  const body = await readBody(req);

  // Honeypot: real people never see the "website" field. Pretend success.
  const lang = body.lang === "es" ? "es" : "en";
  const back = () => Response.redirect(new URL(lang === "es" ? "/contact/?sent=1&lang=es#quote" : "/contact/?sent=1#quote", req.url).href, 303);
  if (str(body.website)) return isForm ? back() : json({ ok: true });

  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  if (!name) throw new HttpError(400, "Please tell us your name");
  if (!email && !phone) throw new HttpError(400, "Please leave an email or phone number");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "That email address looks wrong");

  // Spam guard: at most 5 requests a minute from one address (Cloudflare rate-limit binding).
  if (env.QUOTE_LIMIT) {
    const ip = req.headers.get("cf-connecting-ip") || "local";
    const { success } = await env.QUOTE_LIMIT.limit({ key: "quote:" + ip });
    if (!success) throw new HttpError(429, lang === "es"
      ? "Demasiadas solicitudes. Espere un minuto o llámenos al (510) 369-9079."
      : "Too many requests. Please wait a minute or call us at (510) 369-9079.");
  }

  const scope = str(body.scope, 20);
  const q = {
    id: uid(),
    created_at: now(),
    name,
    email,
    phone,
    address: str(body.address, 300),
    scope: scope && SCOPES.includes(scope) ? scope : "other",
    rooms: int(body.rooms, { min: 0, max: 500 }),
    sqft: int(body.sqft, { min: 0, max: 1e6 }),
    timeline: str(body.timeline, 60),
    message: str(body.message),
    lang,
  };
  await env.DB.prepare(
    `INSERT INTO quotes (id, created_at, name, email, phone, address, scope, rooms, sqft, timeline, message, lang)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(q.id, q.created_at, q.name, q.email, q.phone, q.address, q.scope, q.rooms, q.sqft, q.timeline, q.message, q.lang).run();
  url.waitUntil(alertUnlessFlooded(env, q, url.origin)); // don't make the visitor wait for the alert

  if (isForm) return back();
  return json({ ok: true, id: q.id }, 201);
}

/** If a flood of requests gets through (many senders at once), stop buzzing the phone:
 *  after 10 alerts in 10 minutes the rest are only saved in the job manager. */
async function alertUnlessFlooded(env, q, origin) {
  const since = new Date(Date.now() - 10 * 60e3).toISOString();
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM quotes WHERE created_at > ?").bind(since).first();
  if ((row?.n || 0) > 10) return;
  return notifyNewQuote(env, q, origin);
}

/**
 * Push alert to Joshua's phone through ntfy (free app: ntfy.sh) with the full request:
 * name, phone, email, address, job and message, plus "Call" and "Job manager" buttons.
 * Set the topic with   npx wrangler secret put NTFY_TOPIC   and subscribe to the same
 * topic in the ntfy app. Anyone who knows the topic name can read these alerts, and
 * ntfy.sh keeps each one for about 12 hours, so the topic name must stay secret.
 * Sent as JSON so accented names (José, Peña…) arrive intact.
 */
async function notifyNewQuote(env, q, origin) {
  if (!env.NTFY_TOPIC) return;
  const kind = { interior: "Interior", exterior: "Exterior", cabinets: "Cabinets", walls: "Wall repair", waterproofing: "Waterproofing", commercial: "Commercial" }[q.scope] || "Other";
  const lines = [
    `${kind} job${q.lang === "es" ? " · wrote in Spanish" : ""}`,
    q.phone && `Phone: ${q.phone}`,
    q.email && `Email: ${q.email}`,
    q.address && `Address: ${q.address}`,
    [q.rooms && `${q.rooms} rooms`, q.sqft && `${q.sqft} sq ft`, q.timeline].filter(Boolean).join(" · "),
    q.message && `\n${q.message.slice(0, 600)}${q.message.length > 600 ? "…" : ""}`,
  ].filter(Boolean);
  const actions = [];
  const dial = (q.phone || "").replace(/[^\d+]/g, "");
  if (dial.length >= 7) actions.push({ action: "view", label: "Call", url: "tel:" + dial, clear: false });
  if (q.email) actions.push({ action: "view", label: "Email", url: "mailto:" + encodeURI(q.email), clear: false });
  actions.push({ action: "view", label: "Job manager", url: origin + "/admin/", clear: false });
  try {
    const res = await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic: env.NTFY_TOPIC,
        title: `New quote: ${q.name}`.slice(0, 120),
        message: lines.join("\n"),
        tags: ["house", "bell"],
        priority: 4,
        click: origin + "/admin/",
        actions,
      }),
    });
    if (!res.ok) console.error("quote alert refused by ntfy", res.status, (await res.text()).slice(0, 200));
  } catch (err) {
    console.error("quote alert failed", err);
  }
}

/** Page-view counter. Called by the site's own pages; stores no cookies, IPs or personal data. */
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|node-fetch/i;
async function countVisit(req, env) {
  if (BOT.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
  let b;
  try { b = JSON.parse(await req.text()); } catch { return new Response(null, { status: 204 }); }
  const path = typeof b.p === "string" && /^\/[a-z0-9\/-]{0,80}$/.test(b.p) && !b.p.startsWith("/admin") ? b.p : null;
  if (!path) return new Response(null, { status: 204 });
  let ref = "";
  try {
    const host = new URL(b.r).hostname.replace(/^www\./, "");
    if (host && host !== new URL(req.url).hostname) ref = host.slice(0, 80);
  } catch {}
  const lang = b.l === "es" ? "es" : "en";
  await env.DB.prepare(
    `INSERT INTO pageviews (day, path, ref, lang, views) VALUES (?, ?, ?, ?, 1)
     ON CONFLICT (day, path, ref, lang) DO UPDATE SET views = views + 1`
  ).bind(now().slice(0, 10), path, ref, lang).run();
  return new Response(null, { status: 204 });
}

async function visitorStats(env, url) {
  const days = int(url.searchParams.get("days"), { min: 1, max: 365 }) || 30;
  const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
  const [byDay, byPath, byRef, byLang] = await env.DB.batch([
    env.DB.prepare("SELECT day, SUM(views) AS views FROM pageviews WHERE day >= ? GROUP BY day ORDER BY day").bind(since),
    env.DB.prepare("SELECT path, SUM(views) AS views FROM pageviews WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 15").bind(since),
    env.DB.prepare("SELECT ref, SUM(views) AS views FROM pageviews WHERE day >= ? AND ref != '' GROUP BY ref ORDER BY views DESC LIMIT 10").bind(since),
    env.DB.prepare("SELECT lang, SUM(views) AS views FROM pageviews WHERE day >= ? GROUP BY lang").bind(since),
  ]);
  return json({ days, since, by_day: byDay.results, by_path: byPath.results, by_ref: byRef.results, by_lang: byLang.results });
}

// ───────────────────────────── admin routes ─────────────────────────────

async function summary(env) {
  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const [byStatus, newQuotes, pipeline, upcoming] = await env.DB.batch([
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM jobs GROUP BY status"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM quotes WHERE status = 'new'"),
    // value of the newest non-rejected estimate on every open job
    env.DB.prepare(
      `SELECT COALESCE(SUM(e.total), 0) AS value FROM jobs j
       JOIN estimates e ON e.id = (
         SELECT id FROM estimates WHERE job_id = j.id AND status != 'rejected' ORDER BY created_at DESC LIMIT 1)
       WHERE j.status NOT IN ('done','cancelled')`
    ),
    env.DB.prepare(
      `SELECT s.*, j.ref, j.title, j.address, c.name AS crew_name, c.color AS crew_color
       FROM schedule s JOIN jobs j ON j.id = s.job_id LEFT JOIN crews c ON c.id = s.crew_id
       WHERE s.end_date >= ? AND s.start_date <= ? ORDER BY s.start_date`
    ).bind(today, in14),
  ]);
  const counts = Object.fromEntries(JOB_STATUSES.map((s) => [s, 0]));
  for (const r of byStatus.results) counts[r.status] = r.n;
  return json({
    jobs: counts,
    new_quotes: newQuotes.results[0].n,
    pipeline_value: pipeline.results[0].value,
    upcoming: upcoming.results,
  });
}

async function listQuotes(env, url) {
  const status = url.searchParams.get("status");
  const stmt = status
    ? env.DB.prepare("SELECT * FROM quotes WHERE status = ? ORDER BY created_at DESC LIMIT 500").bind(oneOf(status, ["new", "converted", "declined"], "status"))
    : env.DB.prepare("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 500");
  return json((await stmt.all()).results);
}

async function patchQuote(req, env, id) {
  const body = await readBody(req);
  const status = oneOf(body.status, ["new", "declined"], "status");
  const r = await env.DB.prepare("UPDATE quotes SET status = ? WHERE id = ? AND status != 'converted'").bind(status, id).run();
  if (!r.meta.changes) throw new HttpError(404, "Quote not found or already converted");
  return json({ ok: true });
}

async function convertQuote(env, id) {
  const q = await env.DB.prepare("SELECT * FROM quotes WHERE id = ?").bind(id).first();
  if (!q) throw new HttpError(404, "Quote not found");
  if (q.status === "converted") throw new HttpError(409, "Quote already converted", { job_id: q.job_id });

  const notes = [
    q.lang === "es" ? "Client wrote in Spanish — reply in Spanish." : null,
    q.rooms ? `${q.rooms} rooms` : null,
    q.sqft ? `${q.sqft} sq ft` : null,
    q.timeline ? `Timeline: ${q.timeline}` : null,
    q.message,
  ].filter(Boolean).join("\n");
  const job = await insertJob(env, {
    title: `${cap(q.scope || "painting")} — ${q.address || q.name}`,
    client_name: q.name,
    client_email: q.email,
    client_phone: q.phone,
    address: q.address,
    scope: q.scope,
    notes,
    quote_id: q.id,
  }, "Created from website quote request", [
    env.DB.prepare("UPDATE quotes SET status = 'converted', job_id = ?1 WHERE id = ?2"),
  ]);
  return json(job, 201);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Inserts a job (retrying once if two requests race for the same ref). `extra` statements get bound with (jobId, quoteId). */
async function insertJob(env, fields, activityText, extra = []) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = uid();
    const ref = await nextJobRef(env);
    const t = now();
    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO jobs (id, ref, created_at, updated_at, title, client_name, client_email, client_phone, address, scope, status, notes, quote_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, ref, t, t, fields.title, fields.client_name, fields.client_email ?? null, fields.client_phone ?? null,
          fields.address ?? null, fields.scope ?? null, fields.status || "lead", fields.notes ?? null, fields.quote_id ?? null),
        logActivity(env, id, activityText),
        ...extra.map((s) => s.bind(id, fields.quote_id)),
      ]);
      return getJobOr404(env, id);
    } catch (e) {
      if (!String(e.message).includes("UNIQUE") || attempt === 2) throw e;
    }
  }
}

function jobFields(body, partial) {
  const out = {};
  const set = (k, v) => { if (!partial || k in body) out[k] = v; };
  set("title", str(body.title, 200));
  set("client_name", str(body.client_name, 120));
  set("client_email", str(body.client_email, 200));
  set("client_phone", str(body.client_phone, 40));
  set("address", str(body.address, 300));
  set("scope", body.scope == null || body.scope === "" ? null : oneOf(body.scope, SCOPES, "scope"));
  set("notes", str(body.notes));
  if ("status" in body || !partial) out.status = body.status == null && !partial ? "lead" : oneOf(body.status, JOB_STATUSES, "status");
  if (!partial || "title" in out) if (!out.title) throw new HttpError(400, "title is required");
  if (!partial || "client_name" in out) if (!out.client_name) throw new HttpError(400, "client_name is required");
  return out;
}

async function listJobs(env, url) {
  const where = [];
  const args = [];
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  if (status) { where.push("j.status = ?"); args.push(oneOf(status, JOB_STATUSES, "status")); }
  if (q) {
    where.push("(j.title LIKE ? OR j.client_name LIKE ? OR j.address LIKE ? OR j.ref LIKE ?)");
    const like = `%${q.slice(0, 100)}%`;
    args.push(like, like, like, like);
  }
  const sql = `
    SELECT j.*,
      (SELECT total FROM estimates WHERE job_id = j.id AND status != 'rejected' ORDER BY created_at DESC LIMIT 1) AS estimate_total,
      (SELECT MIN(start_date) FROM schedule WHERE job_id = j.id AND end_date >= date('now')) AS next_date
    FROM jobs j ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY j.updated_at DESC LIMIT 1000`;
  return json((await env.DB.prepare(sql).bind(...args).all()).results);
}

async function createJob(req, env) {
  const fields = jobFields(await readBody(req), false);
  return json(await insertJob(env, fields, "Job created"), 201);
}

async function getJob(env, id) {
  const job = await getJobOr404(env, id);
  const [ests, items, sched, act] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM estimates WHERE job_id = ? ORDER BY created_at DESC").bind(id),
    env.DB.prepare(
      "SELECT i.* FROM estimate_items i JOIN estimates e ON e.id = i.estimate_id WHERE e.job_id = ? ORDER BY i.position"
    ).bind(id),
    env.DB.prepare(
      `SELECT s.*, c.name AS crew_name, c.color AS crew_color FROM schedule s
       LEFT JOIN crews c ON c.id = s.crew_id WHERE s.job_id = ? ORDER BY s.start_date`
    ).bind(id),
    env.DB.prepare("SELECT at, text FROM activity WHERE job_id = ? ORDER BY id DESC LIMIT 200").bind(id),
  ]);
  job.estimates = ests.results.map((e) => ({ ...e, items: items.results.filter((i) => i.estimate_id === e.id) }));
  job.schedule = sched.results;
  job.activity = act.results;
  return json(job);
}

async function patchJob(req, env, id) {
  const before = await getJobOr404(env, id);
  const fields = jobFields(await readBody(req), true);
  const keys = Object.keys(fields);
  if (!keys.length) throw new HttpError(400, "Nothing to update");
  const stmts = [
    env.DB.prepare(`UPDATE jobs SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...keys.map((k) => fields[k]), now(), id),
  ];
  if (fields.status && fields.status !== before.status) {
    stmts.push(logActivity(env, id, `Status: ${before.status} → ${fields.status}`));
  } else {
    stmts.push(logActivity(env, id, `Edited ${keys.join(", ")}`));
  }
  await env.DB.batch(stmts);
  return json(await getJobOr404(env, id));
}

async function deleteJob(env, id) {
  // D1 enforces foreign keys, so estimates / schedule / activity cascade.
  const r = await env.DB.prepare("DELETE FROM jobs WHERE id = ?").bind(id).run();
  if (!r.meta.changes) throw new HttpError(404, "Job not found");
  return json({ ok: true });
}

/** Moving forward through the pipeline happens automatically; never backwards. */
function advanceStatus(env, job, to, why) {
  const order = ["lead", "estimated", "scheduled", "in_progress", "done"];
  const from = order.indexOf(job.status);
  if (from === -1 || order.indexOf(to) <= from) return [];
  return [
    env.DB.prepare("UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?").bind(to, now(), job.id),
    logActivity(env, job.id, `Status: ${job.status} → ${to} (${why})`),
  ];
}

async function createEstimate(req, env, jobId) {
  const job = await getJobOr404(env, jobId);
  const e = priceEstimate(await readBody(req));
  const id = uid();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO estimates (id, job_id, created_at, tax_rate, discount, subtotal, tax, total, gallons, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, jobId, now(), e.tax_rate, e.discount, e.subtotal, e.tax, e.total, e.gallons, e.notes),
    ...insertItems(env, id, e.items),
    logActivity(env, jobId, `Estimate drafted: $${e.total.toFixed(2)}`),
    env.DB.prepare("UPDATE jobs SET updated_at = ? WHERE id = ?").bind(now(), jobId),
    ...advanceStatus(env, job, "estimated", "estimate drafted"),
  ]);
  return json(await loadEstimate(env, id), 201);
}

async function replaceEstimate(req, env, id) {
  const before = await loadEstimate(env, id);
  if (before.status === "accepted") throw new HttpError(409, "Accepted estimates are locked — create a new one");
  const e = priceEstimate(await readBody(req));
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE estimates SET tax_rate = ?, discount = ?, subtotal = ?, tax = ?, total = ?, gallons = ?, notes = ? WHERE id = ?"
    ).bind(e.tax_rate, e.discount, e.subtotal, e.tax, e.total, e.gallons, e.notes, id),
    env.DB.prepare("DELETE FROM estimate_items WHERE estimate_id = ?").bind(id),
    ...insertItems(env, id, e.items),
    logActivity(env, before.job_id, `Estimate revised: $${before.total.toFixed(2)} → $${e.total.toFixed(2)}`),
  ]);
  return json(await loadEstimate(env, id));
}

async function patchEstimate(req, env, id) {
  const est = await loadEstimate(env, id);
  const status = oneOf((await readBody(req)).status, EST_STATUSES, "status");
  const job = await getJobOr404(env, est.job_id);
  await env.DB.batch([
    env.DB.prepare("UPDATE estimates SET status = ? WHERE id = ?").bind(status, id),
    logActivity(env, job.id, `Estimate $${est.total.toFixed(2)} marked ${status}`),
    env.DB.prepare("UPDATE jobs SET updated_at = ? WHERE id = ?").bind(now(), job.id),
  ]);
  return json(await loadEstimate(env, id));
}

async function deleteEstimate(env, id) {
  const est = await loadEstimate(env, id);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM estimates WHERE id = ?").bind(id),
    logActivity(env, est.job_id, `Estimate $${est.total.toFixed(2)} deleted`),
  ]);
  return json({ ok: true });
}

async function createBooking(req, env, jobId) {
  const job = await getJobOr404(env, jobId);
  const body = await readBody(req);
  const start = body.start_date;
  const end = body.end_date || body.start_date;
  if (!isDate(start) || !isDate(end)) throw new HttpError(400, "start_date and end_date must be YYYY-MM-DD");
  if (end < start) throw new HttpError(400, "end_date is before start_date");
  const crewId = str(body.crew_id, 64);
  let crew = null;
  if (crewId) {
    crew = await env.DB.prepare("SELECT * FROM crews WHERE id = ?").bind(crewId).first();
    if (!crew) throw new HttpError(400, "Unknown crew");
    if (!body.force) {
      const { results } = await env.DB.prepare(
        `SELECT s.start_date, s.end_date, j.ref, j.title FROM schedule s JOIN jobs j ON j.id = s.job_id
         WHERE s.crew_id = ? AND s.start_date <= ? AND s.end_date >= ?`
      ).bind(crewId, end, start).all();
      if (results.length) throw new HttpError(409, `${crew.name} is already booked on those dates`, { conflicts: results });
    }
  }
  const id = uid();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO schedule (id, job_id, crew_id, start_date, end_date, note) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, jobId, crewId, start, end, str(body.note, 300)),
    logActivity(env, jobId, `Booked ${crew ? crew.name : "unassigned"} ${start}${end !== start ? " → " + end : ""}`),
    env.DB.prepare("UPDATE jobs SET updated_at = ? WHERE id = ?").bind(now(), jobId),
    ...advanceStatus(env, job, "scheduled", "crew booked"),
  ]);
  return json({ id }, 201);
}

async function deleteBooking(env, id) {
  const row = await env.DB.prepare("SELECT * FROM schedule WHERE id = ?").bind(id).first();
  if (!row) throw new HttpError(404, "Booking not found");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM schedule WHERE id = ?").bind(id),
    logActivity(env, row.job_id, `Booking ${row.start_date} removed`),
  ]);
  return json({ ok: true });
}

async function listSchedule(env, url) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isDate(from) || !isDate(to)) throw new HttpError(400, "from and to must be YYYY-MM-DD");
  const { results } = await env.DB.prepare(
    `SELECT s.*, j.ref, j.title, j.status AS job_status, j.address, c.name AS crew_name, c.color AS crew_color
     FROM schedule s JOIN jobs j ON j.id = s.job_id LEFT JOIN crews c ON c.id = s.crew_id
     WHERE s.end_date >= ? AND s.start_date <= ? ORDER BY s.start_date, c.name`
  ).bind(from, to).all();
  return json(results);
}

async function listCrews(env) {
  return json((await env.DB.prepare("SELECT * FROM crews ORDER BY active DESC, name").all()).results);
}

function crewFields(body, partial) {
  const out = {};
  if (!partial || "name" in body) {
    out.name = str(body.name, 80);
    if (!out.name) throw new HttpError(400, "Crew name is required");
  }
  if (!partial || "lead" in body) out.lead = str(body.lead, 80);
  if (!partial || "phone" in body) out.phone = str(body.phone, 40);
  if (!partial || "color" in body) {
    const c = str(body.color, 7) || "#111111";
    if (!/^#[0-9a-fA-F]{6}$/.test(c)) throw new HttpError(400, "color must be #RRGGBB");
    out.color = c;
  }
  if ("active" in body) out.active = body.active ? 1 : 0;
  return out;
}

async function createCrew(req, env) {
  const f = crewFields(await readBody(req), false);
  const id = uid();
  await env.DB.prepare("INSERT INTO crews (id, name, lead, phone, color, active) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, f.name, f.lead, f.phone, f.color, f.active ?? 1).run();
  return json({ id, ...f }, 201);
}

async function patchCrew(req, env, id) {
  const f = crewFields(await readBody(req), true);
  const keys = Object.keys(f);
  if (!keys.length) throw new HttpError(400, "Nothing to update");
  const r = await env.DB.prepare(`UPDATE crews SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
    .bind(...keys.map((k) => f[k]), id).run();
  if (!r.meta.changes) throw new HttpError(404, "Crew not found");
  return json({ ok: true });
}

// ───────────────────────────── router ─────────────────────────────

const routes = [
  ["POST", /^\/api\/quotes$/, (r, e, u) => createQuote(r, e, u), false],
  ["POST", /^\/api\/hit$/, (r, e) => countVisit(r, e), false],
  ["GET", /^\/api\/admin\/stats$/, (r, e, u) => visitorStats(e, u)],
  ["GET", /^\/api\/health$/, () => json({ ok: true }), false],

  ["GET", /^\/api\/admin\/summary$/, (r, e) => summary(e)],
  ["GET", /^\/api\/admin\/quotes$/, (r, e, u) => listQuotes(e, u)],
  ["PATCH", /^\/api\/admin\/quotes\/([\w-]+)$/, (r, e, u, id) => patchQuote(r, e, id)],
  ["POST", /^\/api\/admin\/quotes\/([\w-]+)\/convert$/, (r, e, u, id) => convertQuote(e, id)],

  ["GET", /^\/api\/admin\/jobs$/, (r, e, u) => listJobs(e, u)],
  ["POST", /^\/api\/admin\/jobs$/, (r, e) => createJob(r, e)],
  ["GET", /^\/api\/admin\/jobs\/([\w-]+)$/, (r, e, u, id) => getJob(e, id)],
  ["PATCH", /^\/api\/admin\/jobs\/([\w-]+)$/, (r, e, u, id) => patchJob(r, e, id)],
  ["DELETE", /^\/api\/admin\/jobs\/([\w-]+)$/, (r, e, u, id) => deleteJob(e, id)],
  ["POST", /^\/api\/admin\/jobs\/([\w-]+)\/estimates$/, (r, e, u, id) => createEstimate(r, e, id)],
  ["POST", /^\/api\/admin\/jobs\/([\w-]+)\/schedule$/, (r, e, u, id) => createBooking(r, e, id)],

  ["GET", /^\/api\/admin\/estimates\/([\w-]+)$/, (r, e, u, id) => loadEstimate(e, id).then(json)],
  ["PUT", /^\/api\/admin\/estimates\/([\w-]+)$/, (r, e, u, id) => replaceEstimate(r, e, id)],
  ["PATCH", /^\/api\/admin\/estimates\/([\w-]+)$/, (r, e, u, id) => patchEstimate(r, e, id)],
  ["DELETE", /^\/api\/admin\/estimates\/([\w-]+)$/, (r, e, u, id) => deleteEstimate(e, id)],

  ["GET", /^\/api\/admin\/schedule$/, (r, e, u) => listSchedule(e, u)],
  ["DELETE", /^\/api\/admin\/schedule\/([\w-]+)$/, (r, e, u, id) => deleteBooking(e, id)],

  ["GET", /^\/api\/admin\/crews$/, (r, e) => listCrews(e)],
  ["POST", /^\/api\/admin\/crews$/, (r, e) => createCrew(r, e)],
  ["PATCH", /^\/api\/admin\/crews\/([\w-]+)$/, (r, e, u, id) => patchCrew(r, e, id)],
];

/** /static/ was the preview address of the design we kept; send old links to the home page. */
function staticView(url) {
  return Response.redirect(new URL("/" + url.search, url).href, 301);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    url.waitUntil = (p) => (ctx ? ctx.waitUntil(p) : p);
    if (url.pathname === "/static" || url.pathname === "/static/") return staticView(url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);

    try {
      let pathMatched = false;
      for (const [method, pattern, handler, admin = true] of routes) {
        const m = url.pathname.match(pattern);
        if (!m) continue;
        pathMatched = true;
        if (method !== req.method) continue;
        if (admin) requireAdmin(req, env);
        return await handler(req, env, url, ...m.slice(1));
      }
      return json({ error: pathMatched ? "Method not allowed" : "Not found" }, pathMatched ? 405 : 404);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, ...(err.extra || {}) }, err.status);
      console.error(err);
      return json({ error: "Server error" }, 500);
    }
  },
};
