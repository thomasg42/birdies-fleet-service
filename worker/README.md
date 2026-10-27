# Birdies booking backend

One Cloudflare Worker plus a D1 database. It implements `../BOOKING-API-CONTRACT.md`, the contract the site's schedule, fleet and reschedule pages already call. Booking rules, Denver time and message drafts come from `../src/assets/birdies-core.js` through `../site.config.mjs`, so the site and the backend can never disagree about a window. Change J's hours there, once.

## What it guarantees

- **No double booking.** Each held window is one row in `slots` with the window as primary key. Two requests for the same window cannot both win (tested with two simultaneous bookings).
- **A fleet bump is all or nothing.** Moving the customer out, giving the window to the fleet client, storing the reschedule link and writing both messages happen in one transaction.
- **Nothing is sent until approved.** Every message is written to `outbox`. With no `NOTIFY_WEBHOOK` set it is a dry run: messages wait and can be read at `GET /admin/outbox`. With the webhook set, each one is delivered once; a cron retries failures every 5 minutes.
- PINs are PBKDF2-hashed; five wrong PINs lock a Fleet ID for 15 minutes; logins are also capped per IP. Reschedule links and sessions store only a hash of the token.

## Test

```
node --test worker/test/worker.test.mjs
```

Runs the real Worker against real SQLite (`node:sqlite`) shaped like D1: availability, the Nov 1 clock change, the double-booking race, honeypot and validation, PIN lockout, every fleet board state, the full bump story (confirm, bump, link, callback, reschedule, link used up), a lost reschedule race, CORS, admin auth, and webhook delivery.

## Deploy (Thomas approves; Lane 1 runs it)

From `worker/`:

1. `npx wrangler login` (Thomas, once per machine).
2. `npx wrangler d1 create birdies-booking`, put the id in `wrangler.toml`.
3. `npx wrangler d1 execute birdies-booking --remote --file=schema.sql`
4. `npx wrangler secret put ADMIN_KEY` (random; keep it out of the repo, wiki and logs).
5. `npx wrangler deploy`, note the `workers.dev` URL.
6. Smoke test the live URL on a window weeks out, then delete the test rows.
7. Fleet accounts: `npx wrangler secret put OWNER_PIN` (6 to 8 digits Jay can remember; a credential action), then Jay adds them himself at `/fleet-admin/`. `POST /admin/fleet-accounts` with the admin key still works.
8. Notifications: point `NOTIFY_WEBHOOK` and `NOTIFY_SECRET` at the n8n workflow, set `OWNER_EMAIL` and `OWNER_PHONE` in `wrangler.toml`.
9. Only then set `booking.api` (and `leadEndpoint` to `<api>/leads`) in `site.config.mjs`, rebuild, push, and run the site-qa gate. Never connect the site before J's alerts work: a booking J never hears about is worse than no booking.

## Admin routes (Bearer ADMIN_KEY)

- `GET /admin/outbox`: the last 100 messages and their delivery state.
- `GET /admin/bookings`: every booking, oldest window first.
- `POST /admin/fleet-accounts` `{ id, name, pin, active }`: create, rename, re-PIN or disable. Signs that account out.
- `POST /admin/blocks` `{ windowId, blocked }`: block or free a window for J's own time.
