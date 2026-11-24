-- Joshua's Painting Service — painting job manager (Cloudflare D1 / SQLite)
-- Apply locally:  npm run db:local
-- Apply remotely: npm run db:remote

PRAGMA foreign_keys = ON;

-- Incoming requests from the public quote form.
CREATE TABLE IF NOT EXISTS quotes (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  scope        TEXT,            -- interior | exterior | cabinets | commercial | other
  rooms        INTEGER,
  sqft         INTEGER,
  timeline     TEXT,
  message      TEXT,
  lang         TEXT NOT NULL DEFAULT 'en',  -- en | es: language the client used on the site
  status       TEXT NOT NULL DEFAULT 'new'  -- new | converted | declined
                CHECK (status IN ('new','converted','declined')),
  job_id       TEXT REFERENCES jobs(id) ON DELETE SET NULL
);

-- Painting crews.
CREATE TABLE IF NOT EXISTS crews (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  lead        TEXT,
  phone       TEXT,
  color       TEXT NOT NULL DEFAULT '#111111',
  active      INTEGER NOT NULL DEFAULT 1
);

-- A job moves through the board: lead → estimated → scheduled → in_progress → done
-- (or cancelled). `ref` is the human-readable job number, e.g. JP-0007.
CREATE TABLE IF NOT EXISTS jobs (
  id           TEXT PRIMARY KEY,
  ref          TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  title        TEXT NOT NULL,
  client_name  TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  address      TEXT,
  scope        TEXT,
  status       TEXT NOT NULL DEFAULT 'lead'
                CHECK (status IN ('lead','estimated','scheduled','in_progress','done','cancelled')),
  notes        TEXT,
  quote_id     TEXT
);

-- Estimates: one or more per job, each with line items. Totals are computed
-- server-side from line items so the stored numbers never drift.
CREATE TABLE IF NOT EXISTS estimates (
  id           TEXT PRIMARY KEY,
  job_id       TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  status       TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','accepted','rejected')),
  tax_rate     REAL NOT NULL DEFAULT 0,      -- e.g. 0.0925
  discount     REAL NOT NULL DEFAULT 0,      -- flat amount, dollars
  subtotal     REAL NOT NULL DEFAULT 0,
  tax          REAL NOT NULL DEFAULT 0,
  total        REAL NOT NULL DEFAULT 0,
  gallons      REAL NOT NULL DEFAULT 0,      -- paint needed, all items
  notes        TEXT
);

-- kind = 'area'  → qty is square feet; labour = qty × rate; paint = qty × coats / coverage
-- kind = 'unit'  → qty is a count (doors, cabinets…); price = qty × rate
-- kind = 'flat'  → price = rate
CREATE TABLE IF NOT EXISTS estimate_items (
  id           TEXT PRIMARY KEY,
  estimate_id  TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL DEFAULT 0,
  description  TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'area' CHECK (kind IN ('area','unit','flat')),
  qty          REAL NOT NULL DEFAULT 0,
  rate         REAL NOT NULL DEFAULT 0,
  coats        INTEGER NOT NULL DEFAULT 2,
  coverage     REAL NOT NULL DEFAULT 350,   -- sq ft per gallon per coat
  paint_price  REAL NOT NULL DEFAULT 0,     -- dollars per gallon (materials)
  amount       REAL NOT NULL DEFAULT 0,
  gallons      REAL NOT NULL DEFAULT 0
);

-- Crew bookings. A job can have several (prep day, paint days, touch-up).
CREATE TABLE IF NOT EXISTS schedule (
  id          TEXT PRIMARY KEY,
  job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  crew_id     TEXT REFERENCES crews(id) ON DELETE SET NULL,
  start_date  TEXT NOT NULL,   -- YYYY-MM-DD
  end_date    TEXT NOT NULL,   -- YYYY-MM-DD, inclusive
  note        TEXT
);

-- Append-only history shown on each job.
CREATE TABLE IF NOT EXISTS activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  text        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status    ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_est_job        ON estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_items_est      ON estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_sched_dates    ON schedule(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_activity_job   ON activity(job_id, at);
-- No cookies, no IP addresses, no personal data: one row per day + page + referring site + language.
CREATE TABLE IF NOT EXISTS pageviews (
  day   TEXT NOT NULL,              -- YYYY-MM-DD (UTC)
  path  TEXT NOT NULL,              -- e.g. /services/exterior/
  ref   TEXT NOT NULL DEFAULT '',   -- referring site's host name, '' = direct / same site
  lang  TEXT NOT NULL DEFAULT 'en',
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, ref, lang)
);
