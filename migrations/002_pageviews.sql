-- Visitor counts for the job manager's "Visitors" tab.
-- No cookies, no IP addresses, no personal data: one row per day + page + referring site + language.
CREATE TABLE IF NOT EXISTS pageviews (
  day   TEXT NOT NULL,              -- YYYY-MM-DD (UTC)
  path  TEXT NOT NULL,              -- e.g. /services/exterior/
  ref   TEXT NOT NULL DEFAULT '',   -- referring site's host name, '' = direct / same site
  lang  TEXT NOT NULL DEFAULT 'en',
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, ref, lang)
);
