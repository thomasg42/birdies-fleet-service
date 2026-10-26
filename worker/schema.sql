-- Birdies booking backend (Cloudflare D1). Apply with:
--   npx wrangler d1 execute birdies-booking --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  window_id TEXT NOT NULL,
  holder TEXT NOT NULL CHECK (holder IN ('public', 'fleet')),
  fleet_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'bumped', 'rescheduled')),
  name TEXT,
  phone TEXT,
  email TEXT,
  sms_consent INTEGER NOT NULL DEFAULT 0,
  service TEXT,
  service_item TEXT,
  description TEXT,
  vehicle TEXT,
  location TEXT,
  lat TEXT,
  lng TEXT,
  details TEXT,
  full_label TEXT,
  start_at TEXT,
  end_at TEXT,
  created_at TEXT NOT NULL,
  ip TEXT,
  bumped_by TEXT,
  moved_to TEXT,
  rescheduled_from TEXT
);
CREATE INDEX IF NOT EXISTS bookings_window ON bookings (window_id);

-- One row per held window. The primary key is the double-booking guard: two requests for
-- the same window cannot both insert here (the Gold Mobile Mechanic race, closed for good).
CREATE TABLE IF NOT EXISTS slots (
  window_id TEXT PRIMARY KEY,
  booking_id TEXT,
  holder TEXT NOT NULL CHECK (holder IN ('public', 'fleet', 'block'))
);

-- A batch statement "INSERT INTO guard (x) SELECT 1 WHERE changes() = 0" aborts the whole
-- batch when the statement before it changed nothing, so multi-step moves are all or nothing.
CREATE TABLE IF NOT EXISTS guard (x INTEGER CHECK (x = 0));

CREATE TABLE IF NOT EXISTS fleet_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_fails (
  fleet_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  fleet_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reschedules (
  token_hash TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  first_name TEXT,
  original TEXT,
  original_window TEXT,
  options TEXT NOT NULL,
  more TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at TEXT,
  callback_at TEXT
);

-- Every text or email is written here in the same transaction as the booking change.
-- With no NOTIFY_WEBHOOK set, rows wait here (dry run) for review at GET /admin/outbox.
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  to_role TEXT NOT NULL,
  to_name TEXT,
  to_phone TEXT,
  to_email TEXT,
  sms_ok INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  event TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  type TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  units TEXT,
  location TEXT,
  details TEXT,
  sms_consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  ip TEXT
);

CREATE TABLE IF NOT EXISTS hits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
