# Birdies Fleet Service & Backcountry Repair: website + booking backend

Read by Codex and Cursor directly, and by Claude Code through `CLAUDE.md`. Every lane follows the same rules here.

- Live site: https://thomasg42.github.io/birdies-fleet-service/ (GitHub Pages serves `main:/docs`). Hidden from Google while `launched: false` in `site.config.mjs`.
- Site: zero-dependency generator. Every fact lives in `site.config.mjs`; `node build.mjs` writes `docs/`. Never edit `docs/` by hand.
- Booking backend: `worker/` (Cloudflare Worker + D1). Contract: `BOOKING-API-CONTRACT.md`. Rules and Denver time live only in `src/assets/birdies-core.js`.
- Client notes and claims gate live in the FGA-Brain vault at `FGA-AIOS/clients/birdies-fleet-service/` (`context/product-facts.md`). Every word the site prints traces to it.
- Dev tools live outside the repo in `~/dev/fga-tools` (linkedom, Playwright, site-qa). Never `npm install` inside this repo.

## Push protocol (Thomas, 2026-10-22)

Thomas's words decide what goes live:

- **"push"**: publish the finished work to the live site now.
- **"launch"**: let Google index it (`launched: true`). Only after J has confirmed the facts.
- Anything else: build, test and commit, but don't push.

When a piece of work is done:

1. `node build.mjs && node --test tests/site.test.mjs` (plus `node --test worker/test/worker.test.mjs` if `worker/` changed). All green, or fix it first.
2. Commit with named paths. Never force-push, never rewrite history.
3. Tell Thomas in one line what changed, then ask: **"Ready to push?"**

When Thomas says "push":

1. `git push origin main`.
2. Wait for GitHub Pages: `gh api repos/thomasg42/birdies-fleet-service/pages/builds/latest` until `status` is `built` and `commit` is your SHA.
3. Fetch the changed page from the live URL and confirm it shows the change. CSS and JS cache-busting is automatic (content hash in `?v=`).
4. If `worker/` changed, also deploy it: `cd worker && npx wrangler deploy`, then check `<worker URL>/health`.
5. Report the SHA, the live URL and what you checked. Claim only what you verified.

Cursor cloud agents can only push to the repo they start on. Start them on `thomasg42/birdies-fleet-service`, or run Cursor locally on this folder.

## Never without Thomas saying so in his message

`launched: true`; changing repo visibility or Pages settings; buying or connecting a domain; setting or rotating a secret, PIN or API key; sending a text or email to J or a customer; pointing `booking.api` or `leadEndpoint` at the backend before J's alerts are proven; printing anything that is not in the claims gate.
