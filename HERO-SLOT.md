# Hero slot — for Lane 2 (Codex)

The home hero is v0 on purpose. `data-hero-slot="v0-placeholder"` is a pine-to-char gradient, three layered SVG treelines, a faint topo line, and the wordmark. There is no video, canvas, pin, or animation.

Codex replaces the media inside `.hero-media` and leaves the generator markup around it.

## The shot

Start above a dense pine forest. Move down through the trees onto a back road. A diesel service truck with a mechanic bed and a steel rack is waiting, and a brindle dog is with it. The brand lands there: BIRDIES / Fleet Service & Backcountry Repair.

## Rules

- Scroll-scrubbed. Never autoplay.
- Poster image first. That poster is the LCP.
- Reduced motion, no JavaScript, or Save-Data: one static end still. No motion.
- The only `h1` stays visible. Never set it to `display: none`.
- No Ford badges, no F-350 badges, no invented livery text.
- Never caption a generated scene as J's truck or J's dog. The dog is not mentioned anywhere on the site until a real logo or a real photo exists. Both are null today.
- Do not edit copy, booking logic, town essays, or SEO fields.

`bootHeroScrub` in `src/assets/chrome.js` already no-ops unless `[data-hero-video]` exists. When a video is added, it primes with `play()` and then pauses, the same pattern as Montana Movers. Keep that hook. Do not add a second player.

The current `h1` is: "Mobile Fleet Service & Backcountry Repair in Southwest Montana". The tagline under it is "We come to you."
