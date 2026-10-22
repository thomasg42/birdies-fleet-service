# Birdies Fleet Service & Backcountry Repair

Static site for J Smith, mobile mechanic, Southwest Montana. Lane 3 (Cursor) built this on 2026-10-22 from the Lane 1 prompt. The site is not published. GitHub Pages stays off.

## Build

```bash
node build.mjs                 # production -> docs/
node build.mjs --dev           # demo data -> dev-build/  (refuses to write docs/)
node --test tests/site.test.mjs
node tools/serve.mjs docs 8080
node tools/serve.mjs dev-build 8081
```

Zero npm dependencies in the site itself. Tests load linkedom and Playwright from `~/dev/fga-tools` (or `FGA_TOOLS`) through `tools/dev-deps.mjs`.

`launched` is false in `site.config.mjs`. Every page is `noindex` and `robots.txt` is `Disallow: /`. The sitemap still lists the indexable pages so the file is ready for the day Thomas turns the site on.

Production `docs/` has no booking API. The schedule page is a request: it fills a text to J and never says the customer is booked. `node build.mjs --dev` points the page at `/api` and loads `booking-mock.js`, which is not copied into `docs/`.

## Layout

- `site.config.mjs` is the only place facts, towns, services, and booking rules are declared.
- `src/pages.mjs` lists pages. `src/copy.mjs` holds the essays. `src/layout.mjs` and `src/components.mjs` render HTML.
- `src/assets/birdies-core.js` is pure time and validation math. A Worker can import it unchanged.
- `src/assets/booking-api.js` is the browser client.
- Page behavior is split so marketing pages do not download the booking code: `chrome.js`, then `schedule-ui.js`, `fleet-ui.js`, `reschedule-ui.js`, `contact-ui.js`.

## Demo fleet

Only inside the dev mock. Fleet ID `demo`, PIN `1111`, account name "Demo Fleet". Open a dev page with `?now=2026-10-22T09:05` to replay the fleet-override story. That PIN is not in `docs/`.

## Not in this repo

Cloudflare Worker, D1, texting, email, n8n, and calendar sync belong to Lane 1. The contract they should implement is `BOOKING-API-CONTRACT.md`. Hero video and photography belong to Lane 2. See `HERO-SLOT.md`.

Do not run `deploy-preview.sh` until Thomas says to publish.
