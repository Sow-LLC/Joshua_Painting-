-- Adds the language a quote was written in (for databases created before the EN/ES site).
ALTER TABLE quotes ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';
