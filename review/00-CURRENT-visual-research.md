# Birdies visual pass — 2026-10-23, Lane 2 Codex

## Current scope

Thomas approved proceeding with Part 1 before Part 2, using the proposed forest opening and field-atlas service layout. On 2026-10-23 he explicitly held paid images: revisit only after J's photos arrive and the hero quote; identify the slots covered by real photos and quote any remaining card-size images at **1K**. No generation is authorized by a visual-build approval.

## Reference review

Bounded review of four relevant Montana service sites plus two premium outdoor references. This is not an exhaustive census of competitors, a conversion study, or evidence that no similar design exists anywhere. Review volume and current advertising spend were not verified; neither is treated as proof of conversion.

| Reference | Observed pattern | Birdies design response |
|---|---|---|
| [Hardline Automotive](https://hardlineautomotives.com/) | Bold type, high-contrast booking action, prominent working-truck photo, service menu | Keep immediate contact and service scanning; build a quieter, consistent forest/field-guide identity rather than copying its red/black treatment. |
| [Montana Mobile Techs](https://www.montanamobiletechs.com/) | Broad service navigation, conventional service-led site | Give the same services a calmer hierarchy and a legible editorial reading surface. |
| [Northwestern Repair](https://northwesternrepair.com/) | Direct on-site diesel/fleet positioning, phone, service content | Keep the action visible and the reading comfortable; do not borrow qualifications or experience claims. |
| [Silvertip Diesel](https://www.silvertipdiesel.com/fleet-maintenance) | Equipment imagery with fleet/mobile service sections | Reserve real equipment-photo slots; no invented work photographs. |
| [Filson](https://www.filson.com/) | Landscape-led outdoor merchandising, large type, earthy material cues | Use bone-paper texture, generous spacing and a unified pine/bark palette. The captured visit included a promotional overlay, so it is a reference, not a clean model to copy. |
| [SITKA](https://www.sitkagear.com/) | Full-bleed outdoor imagery, clear hierarchy, restrained controls | Build the site around one atmospheric moment and otherwise fast, readable navigation. |

Screenshots: `visual-qa/reference-0.png` through `reference-5.png`, in table order. Captured 2026-10-23 using installed Chrome through bundled Playwright.

## Custom implementation

- Deterministic SVG scenery with three depths of evergreens, a distant peak and a mist band; not paid/generated media and not a representation of J's truck or jobs.
- Forest edges open as the backcountry section enters view. Content is visible independently of progress, and reduced motion shows a static scene.
- Bone-paper service index and service/town reading surfaces; routed-sign kickers, restrained contour linework, consistent typography and button sizing.
- Service-area label placement corrected; mobile booking options use a compact two-column grid with no change to times, validation or behavior.
- Desktop redundant floating action bar removed from display so it cannot obscure reading content; mobile actions retained.
- Real browser checks caught and corrected hidden reveal content and sticky Book contrast. Header accessible name now comes from its visible brand text.

## Photo replacement plan — held, no new quote yet

| Slot | J's photo that can cover it | If no suitable real photo arrives |
|---|---|---|
| Fleet category | Fleet trucks in a yard or a real fleet visit | Quote one card-size 1K illustration. |
| Mobile/diesel category | J's truck or an actual diesel pickup service photo | Quote one card-size 1K illustration; do not call it J's truck. |
| Equipment category | Ranch/construction machine or actual equipment repair | Quote one card-size 1K illustration. |
| Backcountry category | Actual trailhead or forest-road scene | Quote one card-size 1K illustration. |
| Mountain service-truck feature | Real service-truck photo on location | Quote only if still needed after the hero plan and assets are settled. |

The prior declined estimate was GPT Image 2, 2K/high, five one-image runs at 6.5 exact credits each, 32.5 total. It is **not** an active allowance or a future 1K quote. Current session spend: **0 credits**; no generation job IDs.

## Open decisions and source gaps

- Mascot studies shown: seated vector + portrait crest; awaiting Thomas's selection before integration. J's original logo remains untouched.
- Supplied card/sticker originals retained under `images/source/` with provenance and SHA256. No clean logo file or actual service-truck photograph yet.
- Card photos appear to show **435-531-1427**; current website/claims say **435-531-4127**. Flagged, not changed under look-only scope.
- Canonical `tools/site-qa/site-qa.mjs` is absent on this Windows vault (README only). Independent browser QA is documented separately; it is not represented as a run of that harness or proof that real alerts work.
- Website booking API is still disconnected pending J's alert setup. No production booking, notification, Google indexing, external message, paid media or deployment changed.
