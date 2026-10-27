# Booking API contract — proposal for Lane 1

Lane 1's contract file was not in the GitHub clone of FGA-Brain (origin/main at `190db458` had no `birdies-fleet-service` folder). This file is the contract the site already calls. It is a proposal. Where a rule was inferred, it says so. Do not change the JSON shape without changing `src/assets/booking-api.js` and the tests in the same pass.

Base path is empty in production (`site.config.mjs` `booking.api` is `''`). The dev build sets `api` to `/api` in `assets/config.js` only. The browser joins that base to the paths below.

Success for the page is `response.ok` and `body.ok === true`. A 200 with `ok: false` is a failure. Read the body before branching on status. Empty `api` means the schedule page never fetches. It shows "Last step: send it to J" and an `sms:` link. It must not say the customer is booked.

Time math lives only in `src/assets/birdies-core.js`. Import that module from the Worker. Do not reimplement Denver time. All window instants are `America/Denver`. Window ids are local `YYYY-MM-DDTHH:MM` with no offset. `start` and `end` are offset ISO strings (`-06:00` before the fall change, `-07:00` after). The horizon crosses 2026-11-01. Saturday 2026-10-31 08:00 is `-06:00`. Monday 2026-11-02 08:00 is `-07:00`.

## Rules the page assumes

Work days are Monday through Friday (Jay, 2026-10-24). Saturday and Sunday are not work days.

Windows, as an assumption until J says otherwise (do not print "J works 8 to 4" on the site):

- 08:00–10:00, label "8 to 10 AM"
- 10:00–12:00, label "10 AM to 12 PM"
- 12:00–14:00, label "12 to 2 PM"
- 14:00–16:00, label "2 to 4 PM"

`publicFirstDayOffset` default 2. Public earliest start is local today plus that many calendar days, rolled forward onto a work day, at the first window (08:00). That is "not today or tomorrow."

Verified against Thursday 2026-10-22:

- 09:05 → Saturday 2026-10-24 08:00 `-06:00`
- 23:59 → Saturday 2026-10-24 08:00 `-06:00`
- Friday 2026-10-23 00:01 → Monday 2026-10-26 08:00 `-06:00`

`publicFirstDayOffset <= 1` is inferred, because the test suite has one case and the contract file was absent. Same clock time that many calendar days ahead. If that date is not a work day, use the next work day's first window. Otherwise use the next window start at or after that instant. Offset 1 on Thursday 09:05 → Friday 2026-10-23 10:00 `-06:00`.

`fleetLeadMinutes` 60 (Thomas, 2026-10-27: fleet can take any window, same day included, that starts at least an hour out). Fleet earliest start is now plus 60 minutes, then the next window start at or after that instant. Thursday 07:00 → 08:00. Thursday 07:01 → 10:00.

`bumpLeadHours` 2. `bumpOptionCount` 2. Bump options are windows whose start is at or after now plus 2 hours, skipping the taken id and any occupied id. The public lock does not apply. The "more" list is the next 8 after those two. From Thursday 09:05, bumping `2026-10-22T12:00` offers `2026-10-22T14:00` then `2026-10-23T08:00`.

`horizonDays` 21.

PIN lock uses `Date.now()`, not the Denver clock. The fifth bad PIN for a fleet id locks that id for 15 minutes. The server is the only thing that checks the PIN. The demo PIN `1111` exists only in `booking-mock.js`.

Atomic check-and-insert is required in the real Worker. Two requests for the same window at the same instant must not both win. Gold Mobile Mechanic already paid for that bug.

## GET /availability

200:

```json
{
  "ok": true,
  "timezone": "America/Denver",
  "earliestPublicStart": "2026-10-24T08:00:00-06:00",
  "days": [
    {
      "date": "2026-10-24",
      "label": "Saturday, October 24",
      "windows": [
        {
          "id": "2026-10-24T08:00",
          "start": "2026-10-24T08:00:00-06:00",
          "end": "2026-10-24T10:00:00-06:00",
          "label": "8 to 10 AM",
          "full": "Saturday, October 24, 8 to 10 AM",
          "state": "open"
        }
      ]
    }
  ]
}
```

`state` is `open` or `booked`. The field on the wire is `full` (string) plus `state`. A booked window is not selectable on the public page.

Any failure, including HTTP 500 and a network error: the page shows zero windows, disables submit, and offers Retry. It must not invent open times while `api` is set.

## POST /bookings

Body: `service`, `serviceItem`, `description`, `vehicle`, `windowId`, `location`, `lat`, `lng`, `name`, `phone`, `email`, `smsConsent`, `website`.

Honeypot field name is `website` (not `company`). If `website` or `fax` is non-empty, return `{ "ok": true, "ignored": true }` with no `booking` object. The page treats a body without `booking` as not booked.

- 201 `{ "ok": true, "booking": { "id", "label", "full", "start", "end", "windowId" } }`
- 409 `{ "ok": false, "error": "window_taken", "availability": <same shape as GET /availability> }`
- 422 `{ "ok": false, "error": "invalid", "fields": { "phone": "..." } }`

The page keeps every typed field on 409, drops the taken id from the list, and posts once per submit.

## POST /fleet/login

Body: `{ "fleetId", "pin" }`.

- 200 `{ "ok": true, "token", "accountName" }`
- 401 `{ "ok": false, "error": "bad_login" }`
- 429 `{ "ok": false, "error": "locked", "retryAfter": 15 }`

`retryAfter` is minutes. The page says "That Fleet ID and PIN didn't match. Call or text J for help." or "Too many tries. Try again in {n} minutes."

## GET /fleet/windows

`Authorization: Bearer <token>`.

200 `{ "ok": true, "accountName", "windows": [ { "date", "label", "windows": [ ... ] } ] }`.

`windows` is the same day array as `days` on GET /availability. The page also accepts a top-level `days` array if `windows` is missing. Each window `state` is `open`, `booked`, `fleet`, `yours`, or `blocked`.

- `booked` label on the board: "Booked by a customer, priority available"
- `fleet` is another fleet account and is not overridable
- `yours` is this account
- `blocked` is closed

401 clears the token and returns to the login form. The draft fields stay.

## POST /fleet/bookings

Bearer token. Body adds `unit`, `contactName`, `contactPhone`, `details`, and `override: true` only after the dispatcher presses "Yes, take this time".

- 201 `{ "ok": true, "booking": { ... } }`
- 409 `{ "ok": false, "error": "override_required", "window": { "id", "label" } }` when the window is a customer booking and `override` is not true
- 409 `{ "ok": false, "error": "unavailable", "reason": "closed"|"fleet"|"yours"|"blocked", "windows": ... }`
- 422 invalid fields
- 401 unauthorized

Dialog copy, exact:

- title: "Are you sure?"
- body: "Another customer has {label}. If you take it, they'll get a text that something came up, with the next two openings, and J is told right away."
- buttons: "Yes, take this time" and "No, pick another time"

Native `<dialog>`. Esc and No close it and return focus. Override is sent only from Yes.

Fleet success line: "Booked: {label}. J has been notified."

## GET /reschedule?t=

- 200 `{ "ok": true, "state": "open", "firstName", "original": { "label" }, "options": [2], "more": [up to 8] }`
- 410 `{ "ok": false, "error": "expired", "state": "expired" }`
- 404 `{ "ok": false, "error": "not_found", "state": "not_found" }`

Page copy when open, exact: "Hi {firstName}, something came up and J needs to move your {original label} appointment. J will reach out to you in a little bit. If you'd like, pick a new time now:" then two option buttons, "See more times", and "I'll wait for J's call".

Any failure with no API, or a non-ok body: "Call or text J." Do not draw fake options.

## POST /reschedule

`{ "token", "windowId" }` or `{ "token", "choice": "callback" }`.

- 200 `{ "ok": true, "state": "done", "label", "booking" }` after a real pick. The page says "You're set for {label}."
- 200 `{ "ok": true, "state": "callback" }` if they wait. Callback does not burn the token.
- 409 `{ "ok": false, "error": "window_taken", "options", "more" }` redraws the choices and keeps `firstName` and the original label
- 410 if the token was already used by a successful time pick
- 404 unknown token

A successful pick sets the row used and pushes the RESCHEDULED draft.

## POST /leads

Not wired. `leadEndpoint` is `''`. When it is set, the contact page posts the lead body and shows thanks only when `data.ok === true`. Anything else keeps the values and offers a text to J.

## Draft texts the mock renders

These are drafts for J to approve. The dev outbox shows them. Nothing is sent.

- J, `FLEET_OVERRIDE` (calendar: adds the fleet job, removes the bumped booking's entry): `Birdie's fleet EMERGENCY: ${accountName} skipped the line for ${label}. On site: ${contactName} ${contactPhone}. Unit: ${unit}. Where: ${location}. Details: ${details}`
- J, `BUMP_NOTICE` (right after): `Birdie's: ${accountName} bumped ${customerName} ${customerPhone} from ${label}. We're emailing them the next openings (${openings}) with a link to pick one. Call them if you like.` When the customer left no email: `They left no email, so text them the message in the next email.`
- Customer, `BUMP`: `Birdies: Something came up and J needs to move your ${label} appointment. J will reach out to you in a little bit. Next openings: ${openings}. Pick one: ${rescheduleUrl}`
- J, `RESCHEDULED`: `Birdies RESCHEDULED: ${customerName} moved from ${fromLabel} to ${toLabel}.`
- J, `NEW_BOOKING`: `Birdies booking: ${who} booked ${label}. ${name} ${phone}. Where: ${where}.`
- J, `CALLBACK`: `Birdies: ${firstName} will wait for your call about ${original}.`

`rescheduleUrl` is `{origin}/reschedule/?t={token}` plus `&now=` when the dev clock is pinned.

Calendar: rows that put a job on Jay's calendar carry `event { start, end, title, where, bookingId }`; n8n writes `Booking ref: {bookingId}` into the entry. A `FLEET_OVERRIDE` event also carries `cancelBookingId`, and n8n deletes the entry with that ref in the same window.

## Jay's fleet list (owner PIN, page `/fleet-admin/`)

- `POST /owner/login` `{ pin }` → `{ ok, token }`. Checks the Worker secret `OWNER_PIN`; 503 `not_set_up` without it. Five wrong PINs lock it for 15 minutes. The token lasts 12 hours and only works on `/owner/*`.
- `GET /owner/fleet` → `{ ok, accounts: [{ id, name, active, createdAt }] }`. Never returns PINs or hashes.
- `POST /owner/fleet` `{ id, name, pin?, active? }`: a new fleet client needs a PIN (4 to 8 digits). An existing one can be renamed or turned on/off without one. A new PIN or turning off signs that fleet out everywhere and clears its lockout.

## Page obligations

1. No-backend schedule never fetches and never says booked.
2. Live availability failure shows zero windows and Retry.
3. 409 keeps the form and removes that window.
4. Fleet override dialog is the only path that sends `override: true`.
5. Reschedule fail-closed with no options when the token is bad or the API is empty.
6. Honeypot `website` is hidden and aborts the client before `fetch`.
7. SMS consent starts unchecked. The sentence is "Text me about this appointment, including schedule changes. Msg & data rates may apply. Reply STOP to opt out."

## Seed the dev mock uses

Relative to Thursday 2026-10-22 09:05. The first public window (Saturday 8 to 10) is left open so the story can book it. Two other public windows are held by Casey Brooks and Morgan Lee. Thursday 2 to 4 is blocked. Friday 08:00 is held by Northwind Ranch. Phones `4065550142`, `4065550148`, and `4065550177` are mock-only. `?mock=race` makes the next public POST return 409. `?mock=down` makes GET `/availability` and GET `/bookings` return 500. POST still runs.
