# Birdies photographic correction — Lane 2 Codex, 2026-10-23

```text
REQUEST: Replace cartoon evergreen scenery and drawn map with real-life imagery and an authentic Google Map. Add real photographs to the other service-page heroes. All rendered imagery must avoid the cartoon treatment.

BUILD COMMIT: 8ed84f23f0fc7556d93c1259c18f57c3765446b2.
PUBLISH: Authorized by Thomas; exact final report/push SHA is in git history and the subsequent live-verification record. No claim of production booking-alert readiness.
DESTINATION: https://thomasg42.github.io/birdies-fleet-service/

CHANGES:
- Real evergreen/mountain photo in the home hero, with separate phone crop; real pine-road photograph in the backcountry section.
- Seven inspected free stock photographs; home category cards and all six service-page hero photographs wired through SITE.photos. Generic marketing-page headers also have real forest imagery.
- Source/photographer credits and stock-photo alt text distinguish these from J, his vehicle, crew, property and customer jobs.
- Cartoon dog removed from rendered pages, footer and social preview while awaiting J's original logo. Existing text and source insertion slots retained.
- Drawn SVG route replaced by Google-hosted Maps with real roads/town labels, controls and attribution. All ten original service-town links retained. No fabricated business pin or coverage polygon.
- Map starts loading only when the visitor approaches it. No Google requests at the top of the page at 390 or 1440. Actual map rendering checked at both widths. An iframe fallback is supplied for no-JS; town links remain independently usable.
- Responsive photo dimensions, lazy section imagery, high-priority hero and WebP optimization. Local dev server now serves WebP with image/webp MIME.
- Photographic social PNG replaces the illustrated preview. No generated media, image-model calls, paid stock, keys, new billing account or paid retries.

TEST SUMMARY (verbatim):
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0

TEST CHANGES: Superseded required-cartoon assertions now enforce no rendered dog/forest drawings, real photo dimensions/alt and asset budgets, genuine Google-hosted map, and no unapproved video/autoplay. Link validation permits only configured source-credit URLs, the Google embed and existing website URLs.

BROWSER: 34 route/viewport captures at 390 and 1440; no overflow, missing photos, script errors, rendered cartoon selectors or motion on working screens. Eleven keyboard/menu/back/reduced-motion/demo-fleet checks passed. Reduced-motion and no-JS home captures retained. Final targeted map test: initialGoogleRequests 0, googleMapRendered true, responsiveMapCorrect true, overflow false, cartoons false at both widths.
COPY/SEO: No business wording, title/meta/JSON-LD changes in the 26 generated HTML documents. Preservation comparison excludes SVG and newly added photo-credit figcaptions. Booking behavior/endpoints, phone and indexing unchanged.

LIGHTHOUSE MOBILE, local production build: Performance 90 / Accessibility 100 / Best Practices 100 / SEO 69. Only failed SEO audit is is-crawlable, from the existing noindex/robots block. Earlier photo run scored 70 Performance; Google loaded prematurely despite native lazy loading. Corrected with near-viewport loading and remeasured at 90. LCP 3.6s, CLS 0, TBT 0ms in the final local report. Scores are local lab measurements, not field-performance guarantees.

MEDIA BUDGET: home desktop WebP 188206 bytes; phone WebP 118938; backcountry landscape 192340. All seven 1000x667 section/header WebPs <=150000 bytes. All existing JS/CSS/HTML test budgets pass. Social PNG is a separate share-preview asset, not fetched by the page.

EVIDENCE ROOT (vault): FGA-AIOS/clients/birdies-fleet-service/website/review/photo-qa-20261023/
- home-preview-390.png, home-preview-1440.png
- home-390.png / home-1440.png, all six service pages, Bozeman town, About, schedule, fleet login/board, contact, FAQ, privacy, reschedule and service area captures
- google-map-final-390.png / google-map-final-1440.png
- qa.json; final-map-and-preview.json; interaction-and-lighthouse.json; lighthouse.report.json/.html
- photo-qa.mjs and photo-interaction-qa.mjs in the parent review folder reproduce the checks on this Windows setup.
NOTE: A full-page browser capture can leave a Google iframe blank when outside the active viewport. The dedicated in-viewport map captures and frame checks show the actual rendered Google map; do not diagnose the full-page blank region alone as a failed embed.

SOURCES: images/source/stock-2026-10-23/README.md, download-manifest.json and SHA256SUMS.txt in the vault client home; source summary also copied to repository review/photo-sources-20261023.md. Originals/provider downloads retained untouched. WebP derivatives only are served. Unsplash/Pexels free-use designations and license pages checked; Google embed-help page checked. No claim these are J's photos or all local Montana locations.

COST: 0 credits spent, 0 paid purchases, no generation job IDs. Paid image/hero allowances remain unapproved. New instruction authorizes real stock imagery; it does not lift the paid-generation hold.

ATTACK CHECK: Matched scope to actual pixels; inspected source photos, all imagery loading, responsive hero and map screenshots. Found and fixed premature Google loading and a mobile map-frame presentation issue. Verified actual Google frame/attribution rather than accepting only iframe markup. Preserved all business copy and booking tests. No rendered cartoon imagery found.

LIMITATIONS / OPEN:
- The canonical tools/site-qa/site-qa.mjs is still absent on this Windows vault; the independent browser checks are not that harness or proof that real lead alerts work.
- Booking API remains disconnected pending Lane 1/J's alert setup.
- J's actual service-truck photo and clean logo are still needed for the 10-second rescue storyboard and final real logo. No hero video generated/integrated.
- Hero decisions remain: 10s; early warm sun/light fog; anonymous mechanic in blue overalls, work jacket, dark cap; clean hand-width lift/wheel alignment/mud drop/settle, no glow. Exact compartment and remaining storyboard/crop decisions await the real truck reference.
- Card phone appears 435-531-1427 while site is 435-531-4127. Previously flagged; unchanged under copy lock.
```
