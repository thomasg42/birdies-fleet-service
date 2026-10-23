# Birdies — Lane 2 Codex report, 2026-10-23

```text
STATE: Part 1 authorized code pass built, tested and locally committed. Not pushed. Thomas explicitly held the mascot for J's original logo and held paid section images. Part 2 shot interview has started; no storyboard images, hero generation or integration.

SCOPE: field-atlas layout, bone-paper material, refined type/spacing/navigation, coded forest depth and scroll opening, readable service/town pages, map-label placement, compact static booking controls, accessibility corrections. Copy, facts, metadata, schema, URLs, indexing, booking logic and backend configuration preserved.

REPO: C:\Users\thoma\dev\birdies-fleet-service
BASE SHA: b54c4eee30eb50ea964c4abfb5576b1a88949974
LOCAL BUILD COMMIT: 35d447f421ecb3ca0cdec135b8974bde38560154. A later documentation commit records this report.
PUSHED SHA: none for this work.
DESTINATION: https://thomasg42.github.io/birdies-fleet-service/

TEST SUMMARY (verbatim):
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0

BROWSER QA: 17 routes at 390 and 1440 = 34 screenshots; zero horizontal overflow, page errors or motion on working screens. Home additionally captured with reduced motion and JavaScript off. Isolated DEMO fleet board captured at both widths. Eleven interaction checks passed: skip-to-main, mobile menu Escape/focus, scroll progress, back-content visibility, reduced-motion scenery and demo fleet board. No production lead, booking or message submitted.

PRESERVATION CHECK: all 26 generated HTML documents compared to pre-change HEAD: normalized non-SVG visitor text, metadata and JSON-LD identical. No changed copy/SEO documents. Config changes in generated docs are automatic asset hashes only; source site.config.mjs is untouched.

SCREENSHOT / QA ROOT (vault):
FGA-AIOS/clients/birdies-fleet-service/website/review/visual-qa/
home-390.png, home-1440.png, home-390-reduced.png, home-390-no-js.png;
fleet-maintenance, dot-inspections, mobile-repair, diesel-repair, heavy-equipment-repair, backcountry-repair, service-area-bozeman, schedule, fleet-login, about, contact, faq, reschedule, service-area, privacy, 404.html: each -390.png and -1440.png;
fleet-board-390.png, fleet-board-1440.png;
reference-0.png through reference-5.png;
qa.json, interaction-and-lighthouse.json, lighthouse.report.html, lighthouse.report.json.
REPRODUCTION: visual-qa.mjs and interaction-qa.mjs in the same vault review folder. They use installed Chrome and the bundled runtime; package/temp paths are specific to this Windows machine.

LIGHTHOUSE MOBILE, local production preview:
Performance 98 / Accessibility 100 / Best Practices 100 / SEO 66.
SEO's failed audit is is-crawlable: intentional existing noindex,nofollow and robots Disallow. Do not turn indexing on for a score. No launch authorization.

CANONICAL SITE-QA: not run; tools/site-qa/site-qa.mjs is missing from this Windows vault (README only). Browser checks above are independent evidence, not a claim the canonical harness ran. Live alert delivery remains unverified/disconnected, owned by Lane 1 and waiting for J's destinations.

GENERATION COSTS / JOBS:
Prior declined quote: GPT Image 2, 2K/high, five one-image jobs, 6.5 exact credits each / 32.5 total.
Approved credits: 0. Actually spent: 0. Generation job IDs: none.
Thomas's newest direction: hold images until J's photos and the hero quote; map real-photo coverage before quoting remaining card-size images at 1K. Do not reuse the declined 2K quote as an allowance.

MASCOT: images/00-CURRENT-mascot-directions.svg + .png in the vault client home. Original coded seated mark + compact portrait crest, informed by supplied card motif; J's logo unaltered. Thomas chose HOLD for J's original logo. Existing placeholder remains; studies saved for reference.

HERO QA: not applicable yet; no take or integration. Preserve the mud-rescue sequence exactly. Shot interview, full numbered image storyboard, approval of every image and transition, exact model preflight, quote/cap, one planned motion pass and transition inspection are still required. No paid retries.

OPEN FOR J / THOMAS:
1. J's original logo; Thomas explicitly held the mascot update.
2. Confirm phone: attached cards appear 435-531-1427; current site/claims 435-531-4127. No correction made under look-only instruction.
3. Clean original logo and a real service-truck photo for accurate hero reference. Card/sticker photos are retained in images/source/ with SHA256; they are not truck-reference photographs.
4. Real photos; hero timing/mechanical/camera decisions; later media allowance.
5. Publication only on Thomas's explicit 'push'. Launch/indexing and booking connection remain separate permissions.

ATTACK CHECK: actual browser inspection found hidden fast-scroll content, map label crowding and Book contrast; corrected and rechecked. No copy/SEO drift found. Remaining limitations: mascot intentionally deferred, missing source assets, held images, no hero, missing canonical site-QA, unverified real notification delivery, phone discrepancy.
```

