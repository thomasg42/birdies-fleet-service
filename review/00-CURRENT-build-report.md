BIRDIES BUILD REPORT FOR CLAUDE CODE (Lane 3 Cursor, 2026-10-22 10:34 AM MDT)

No cross-lane overlap. origin/main at 190db458 had no Birdies folder. Newest handoff before this work was 2026-09-15. No 2026-10-22 conversation file existed at start.

Execution mode: Cursor cloud sandbox at /workspace, not Thomas's local disk. Nothing here is on his machine until he pulls.

1. Where: cloud sandbox. Source /workspace/FGA-AIOS/clients/birdies-fleet-service/website. Intended repo https://github.com/thomasg42/birdies-fleet-service. Branch main. Remote origin is that URL. The repo was not created and the push did not land.

gh repo view thomasg42/birdies-fleet-service:
GraphQL: Could not resolve to a Repository with the name 'thomasg42/birdies-fleet-service'. (repository)

gh repo create thomasg42/birdies-fleet-service --private:
GraphQL: Resource not accessible by integration (createRepository)

git push -u origin main:
remote: Repository not found.
fatal: repository 'https://github.com/thomasg42/birdies-fleet-service.git/' not found

Local commits exist. git status --short was empty before this report file. This report is committed on top of the list below. After that commit, status is empty again.

git log --oneline -8
9310be5 Soften the DOT description so it asks J to confirm scope.
74d78c7 Add the contract, hero brief, QA server, and review captures.
01d1c20 Add the production docs build.
7134b96 Add booking rules, the dev mock, and the page tests.
e40e30a Add the Birdies static generator, type, and look.

2. Tests: node --test tests/site.test.mjs
# tests 15
# suites 0
# pass 15
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 920.321281
No skipped tests.

3. site-qa: copied to /tmp so Playwright resolves, with three local changes (first real select option, click button[type=submit] rather than the first button, wait until schedule radios exist and check the first enabled radio). Vault tools/site-qa/site-qa.mjs was not edited. Summary line: FAIL 4  WARN 0  SKIP 2  PASS 62

FAIL form#0 happy path on http://127.0.0.1:8080/schedule/ [desktop]
FAIL form#0 happy path on http://127.0.0.1:8080/schedule/ [mobile]
FAIL form#0 happy path on http://127.0.0.1:8080/contact/ [desktop]
FAIL form#0 happy path on http://127.0.0.1:8080/contact/ [mobile]
Reason for all four: Valid submission produced NO network POST and no navigation. The lead is silently dropped. Expected. Production api is empty. Schedule shows "Last step: send it to J" and an sms link. Contact does the same. Neither posts.

SKIP forms present on http://127.0.0.1:8080/ [desktop] and [mobile]: No <form> element on the page.

Dev http://127.0.0.1:8081/schedule/ desktop and mobile: happy path PASS (a POST to /api/bookings was recorded). No WARNs. tools/serve.mjs answers POST /api/ with 204 so the mock's extra probe does not show up as a console 404.

4. Built output: 26 HTML files. docs/ total 475777 bytes. Five largest: assets/og.png 42724, assets/fonts/barlow-latin-600.woff2 22772, assets/fonts/barlow-latin-400.woff2 22196, index.html 17840, assets/fonts/big-shoulders-display-latin-800.woff2 14556.

HTML files: 404.html, about/index.html, backcountry-repair/index.html, contact/index.html, diesel-repair/index.html, dot-inspections/index.html, faq/index.html, fleet-login/index.html, fleet-maintenance/index.html, heavy-equipment-repair/index.html, index.html, mobile-repair/index.html, privacy/index.html, reschedule/index.html, schedule/index.html, service-area/index.html, service-area/belgrade/index.html, service-area/big-sky/index.html, service-area/big-timber/index.html, service-area/bozeman/index.html, service-area/ennis/index.html, service-area/gardiner/index.html, service-area/livingston/index.html, service-area/manhattan/index.html, service-area/three-forks/index.html, service-area/west-yellowstone/index.html.

5. Files created or changed:
- website/ (own git repo, not part of FGA-Brain): generator, 26 production pages, booking core, dev mock, tests, README, HERO-SLOT.md, BOOKING-API-CONTRACT.md, deploy-preview.sh (not run), review screenshots, copy-for-J, this report.
- FGA-AIOS/clients/birdies-fleet-service/00-START-HERE.md — client home, newest work first.
- FGA-AIOS/clients/birdies-fleet-service/context/product-facts.md — confirmed facts plus UNCONFIRMED lines kept off the site.
- FGA-AIOS/clients/birdies-fleet-service/context/three-ps.md — UNVERIFIED, not used in customer copy.
- FGA-AIOS/clients/birdies-fleet-service/management/client-questionnaire.md — Recommended answers the build used.
- FGA-AIOS/organization/00-FILE-PLACEMENT-RULES.md — Birdies added to the external-client registry.
- wiki/builds/birdies-fleet-service-website.md — build record. Not live.
- wiki/conversations/2026-10-22.md — today's activity.
- wiki/index.md and wiki/log.md — newest links at the top.
- FGA-AIOS/model-routing/session-handoff.md — this session at the top.
- Command center registry was not edited.

6. Booking: production schedule does not call an API (site.config.mjs booking.api is ''). Dev config.js sets api to /api. Routes, from booking-api.js createClient and the boot functions in schedule-ui.js, fleet-ui.js, reschedule-ui.js, contact-ui.js:
- GET /availability — bootSchedule refresh
- POST /bookings — bootSchedule submit
- POST /fleet/login — bootFleet login
- GET /fleet/windows — bootFleet board
- POST /fleet/bookings — bootFleet book, override true only after Yes
- GET /reschedule?t= — bootReschedule
- POST /reschedule — bootReschedule pick or choice callback
- POST /leads — not called. leadEndpoint is empty. contact-ui.js would use postJson only if an endpoint is set.
The mock is booking-mock.js createMock/install. It stores state in localStorage key birdies-mock-v1, seeds the Thursday 2026-10-22 09:05 story, renders the outbox, and does not send anything. The Lane 1 contract file was absent. BOOKING-API-CONTRACT.md is the proposal. Inferred, and written down rather than left silent: publicFirstDayOffset <= 1 means "same clock time N calendar days ahead, then the next window." Callback does not burn the reschedule token. A successful time pick does. Honeypot website returns {ok:true, ignored:true} with no booking object. The page only shows booked when data.ok === true and data.booking exists. Propose Lane 1 keep that shape. Worker must check-and-insert the window so two requests cannot both win.

7. Deviations:
- Prompt file, product-facts, questionnaire, three-ps, and BOOKING-API-CONTRACT.md were not on origin. They were written from the pasted Lane 1 prompt. Said so in 00-CURRENT-cursor-build-prompt.md.
- Work windows are 08:00-10:00, 10:00-12:00, 12:00-14:00, and 14:00-16:00. The 2 to 4 PM window is an assumption so the day is not three slots. Not printed as "J works 8 to 4."
- publicFirstDayOffset <= 1 behavior is inferred from the one Friday 10:00 case. Documented in the contract.
- Category card items came from the prompt because the card file was not in git.
- Booking JS is split and dynamically imported so a marketing page stays small. booking-ui.js is a re-export the browser does not load.
- Phone pattern is [0-9\(\)+\.\s\-]{10,} so Chromium's v-flag regex accepts it. The first pattern was invalid and logged a console error.
- Local site-qa copy only, described in section 3. Stock harness would click "Use my location" and miss the submit.
- serve.mjs returns 204 for POST /api/*.
- Private repo create/push failed. See section 1. Local main is the source of truth on this machine.
- Lighthouse was not run.
- deploy-preview.sh was written and not run. It exits unless BIRDIE_PUBLISH=yes, and even then it stops before enabling Pages.
- Command center not updated. Site is not live.
- Website repo is nested and was not staged into FGA-Brain.

8. Copy that is not verbatim from a product-facts file: the service essays and town essays were written for length (services at least 600 words, towns at least 300). Town geography (county, highway, river) is map description, not a claim about J. Ennis and Gardiner carry data-confirm="true" and the essays say those towns are confirmed. The other eight are data-confirm="false". About says the company is a locally owned LLC because the build prompt said that. No formation document was in the clone. Trust line on the pages: "Insured. Locally owned. J Smith, owner and mobile mechanic." DOT page now says "Confirm the scope with J" rather than "Scope is confirmed." Card item names are on the home and service pages from the prompt's list. Nothing on the site states a price, a review, a certification, or hours of operation.

9. Lighthouse: not run. Budgets measured on the production build: marketing JS site.js+chrome.js 11727 bytes. Schedule graph (those plus birdies-core, booking-api, booking-dom, schedule-ui) 41387 bytes. Fleet graph 40968 bytes. Contact graph 35111 bytes. Reschedule graph 37152 bytes. CSS 9812 bytes. Largest HTML index.html 17840 bytes. All under the 45KB JS and 60KB CSS/HTML marks the tests enforce.

10. Screenshot paths, under website/review/:
home-390.png, home-1440.png, service-mobile-repair-1440.png, town-ennis-1440.png, schedule-production-1440.png, home-reduced-motion-1440.png, story-1-customer-form.png, story-2-customer-booked.png, story-3-fleet-board.png, story-4-are-you-sure.png, story-5-outbox-after-bump.png, story-6-reschedule.png, story-7-rescheduled.png.
Fleet story reached "You're set for" and the outbox contained RESCHEDULED.

11. Known gaps: private GitHub repo does not exist yet, so this sandbox cannot push. Tab order through the header, hero, and the fleet dialog was not a separate browser pass. site-qa keyboard submit passed. The dialog open, No, and Yes paths passed in node tests, and the story clicked Yes in Chromium. A focus trap beyond native showModal was not added. About is thin on purpose. Lighthouse not run. Production happy path fails closed, which is the intended gap until Lane 1 ships the Worker.

12. Open questions for J and Thomas:
- Are the windows 8 to 10, 10 to 12, 12 to 2, and 2 to 4, Monday through Saturday, actually J's day? Sunday is not a work day in the rules.
- Are the four card lists the words on his card?
- Keep Ennis and Gardiner as the two confirmed towns? They are confirm: true.
- Put the fleet-priority disclosure on the site? Draft only, in review/00-CURRENT-copy-for-j.md.
- Is "locally owned LLC" the line he wants on About?
- When Thomas creates thomasg42/birdies-fleet-service as a private repo, push this main. Do not make it public. Do not turn on Pages until he says so.
- Lane 1: implement BOOKING-API-CONTRACT.md, including the atomic window insert. Do not send a text from this sandbox.
