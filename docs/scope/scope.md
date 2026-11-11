# Scope: HearMe

A privacy first, paid 1:1 listening service: one person offers private, booked conversations over Google Meet, positioned explicitly as a supportive conversation, never therapy, with no client accounts and a data minimised privacy promise.

**Build approach:** Tracer Bullet (prove the whole pipe works first: one thin, real booking runs through every layer, then each slice thickens one part of it, end to end).
**Workflow:** GA (after `/develop`: `/check verify`, `/test`, a fresh model `/check review`, then `/document`; most features are treated as needing a spec). Chosen because the product handles real payments, personal data, and India compliance exposure (DPDP), plus a crisis protocol where a bug has real consequences.

_These are recommendations to keep the build orderly, not requirements. Skip anything that does not fit: if a feature's build is already known, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | done |
| 2 | Coding standards & tooling | Foundation | planned |
| 3 | Data model | Foundation | planned |
| 4 | Design system & UI foundation | Foundation | planned |
| 5 | Core booking thread | Slice 1 | planned |
| 6 | Service terms & legal content | Slice 2 | planned |
| 9 | Booking step 1: Session | Slice 2 | planned |
| 10 | Booking step 2: Date & time | Slice 2 | planned |
| 11 | Booking step 3: Details | Slice 2 | planned |
| 12 | Booking step 4: Payment | Slice 2 | planned |
| 14 | Booking confirmed screen | Slice 2 | planned |
| 13 | Google Calendar & Meet integration | Slice 3 | planned |
| 16 | Confirmation email | Slice 3 | planned |
| 25 | Reminder & change emails | Slice 3 | planned |
| 15 | Manage booking | Slice 4 | planned |
| 17 | Data retention & deletion jobs | Slice 4 | planned |
| 18 | Admin auth & RBAC | Slice 5 | planned |
| 19 | Overview dashboard | Slice 5 | planned |
| 20 | Appointments | Slice 5 | planned |
| 21 | History | Slice 5 | planned |
| 22 | Availability settings | Slice 6 | planned |
| 23 | Sessions & pricing settings | Slice 6 | planned |
| 26 | Audit log & settings | Slice 6 | planned |
| 7 | Landing page (desktop & phone) | Slice 7 | planned |
| 8 | Help now page | Slice 7 | planned |
| 24 | Boundaries & safety guide | Slice 7 | planned |
| 27 | Privacy friendly analytics | Slice 7 | planned |
| 28 | Launch readiness | Launch | planned |

## Foundations

### 1. Stack & architecture · done
Record the full stack (Next.js App Router + TypeScript, Tailwind + shadcn/ui, Postgres/Prisma, the PaymentProvider/CalendarProvider/EmailProvider adapters, the booking state machine, the no double booking approach, and the encrypted PII envelope) so every later feature scaffolds on real structure, not guesses.
**Done when:** the stack and its architectural decisions are recorded in a spec, and an empty project scaffold boots locally and passes build.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [x] Verify it: `/check verify stack & architecture`
- [ ] Test it: `/test stack & architecture` (skipped, no app logic yet to test, see /test's report)
- [x] Review it (fresh model): `/check review stack & architecture`
- [x] Document it: `/document stack & architecture`
Spec [0001](../specs/0001-stack-architecture/index.md) · code in `.` (project root)

### 2. Coding standards & tooling
Capture conventions and install lint, format, pre-commit, and CI from the real scaffolded project.
**Done when:** root `AGENTS.md` reflects the real stack and lint/format/pre-commit run clean.
- [ ] Capture conventions + tooling choices: `/audit`

### 3. Data model · needs a decision
Core entities (Booking, Payment, Refund, WebhookEvent, Job, GoogleConnection, EmailLog, AuditLog, Settings), the no double booking exclusion constraint, and the encrypted PII envelope, so every later feature has somewhere real to read and write.
**Done when:** entities, relationships, and the overlap exclusion constraint are migrated and live, with generated types, without needing a breaking migration for later slices.
- [ ] Design it (spec): `/architect data model`

### 4. Design system & UI foundation · needs a decision
Turn the given tokens (Newsreader/Figtree, the colour and shape system, the Figma file) into `design.md` and base, accessible components so every screen feels like one product.
**Done when:** `design.md` covers type/colour/spacing/components, base components meet WCAG 2.2 AA (focus, keyboard, 44px touch targets), and the Figma file is recorded as the source of truth.
- [ ] Design it (spec): `/architect design system & UI foundation`

## Slice 1: Core booking thread

One real booking through every layer (database, server, Razorpay, Google, email, UI). This is the walking skeleton; nothing later starts until it runs on a deployed preview.

### 5. Core booking thread · needs a decision
The thinnest real booking, end to end, which doubles as the walking skeleton: pick one seeded slot, enter a name and email, pay in Razorpay test mode, get confirmed on the verified webhook, with a calendar event, a Meet link and a plain confirmation email. Narrow, but nothing faked.
**Done when:** on a deployed preview, a test payment turns a held slot into a CONFIRMED booking exactly once (webhook verified and deduplicated), a second attempt at the same slot is rejected by the database, and a calendar event with a Meet link plus a confirmation email arrive.
- [ ] Design it (spec): `/architect core booking thread`

## Slice 2: Complete booking flow

Thicken each booking step to the full design: the consent wording it depends on, real slot rules, the encrypted details form, the real hold countdown, and the confirmed screen.

### 6. Service terms & legal content · needs a decision
Draft the positioning copy, the Service terms page, and the privacy notice, refund policy and crisis protocol content that every other screen in this journey quotes or links to, marked for legal review.
**Done when:** the is/isn't framing, the words to use/avoid, the 18+ line, and the data minimised promise are drafted once and reused, the Service terms page renders them, and `consentVersion` is wired to the data model.
- [ ] Design it (spec): `/architect service terms & legal content`

### 9. Booking step 1: Session · needs a decision
Let a visitor pick a session length and see the scope reassurances before committing to a time.
**Done when:** the 30/60 min selection, the "before you book" scope card, and the reassurances (Meet, never recorded, 18+, refund policy) all render and the choice carries into step 2.
- [ ] Design it (spec): `/architect booking step 1 session`

### 10. Booking step 2: Date & time · needs a decision
Show only real, open slots computed from her availability settings, buffer, minimum notice, and booking window, never her busy blocks, in the client's time zone.
**Done when:** the calendar marks available vs unavailable dates correctly, slot generation respects buffer/min notice/booking window/max per day, a hold is taken on selection, and the time zone line is correct and changeable.
- [ ] Design it (spec): `/architect booking step 2 date & time`

### 11. Booking step 3: Details · needs a decision
Collect preferred name, email, optional phone and note, with the two required consent checkboxes, encrypting what is collected.
**Done when:** the form validates required fields and both checkboxes, the note enforces the 280 char limit and warning copy, and submitted details are stored through the encrypted envelope, never in plaintext.
- [ ] Design it (spec): `/architect booking step 3 details`

### 12. Booking step 4: Payment · needs a decision
Take payment through Razorpay hosted checkout against a real countdown hold, confirming the booking only on a verified webhook.
**Done when:** the 10 minute hold is real and expires the slot if unpaid, checkout timeout matches remaining hold time, a booking only reaches CONFIRMED on a verified, deduplicated webhook, and a failed payment or expired hold leaves nothing booked and nothing charged.
- [ ] Design it (spec): `/architect booking step 4 payment`

### 14. Booking confirmed screen · needs a decision
Show the client what they booked and how to join, right after payment succeeds.
**Done when:** date/time, the Meet join link, add to calendar, before you join tips, reschedule/cancel links and the crisis line all render once calendar sync has produced a link.
- [ ] Design it (spec): `/architect booking confirmed screen`

## Slice 3: Calendar & email, hardened

Make the integrations dependable: retries and reconciliation for Google, the full confirmation email, and every other email a client receives.

### 13. Google Calendar & Meet integration · needs a decision
Create the calendar event and Meet link for a confirmed booking without ever adding the client as an attendee or exposing her personal calendars.
**Done when:** a confirmed booking gets a deterministic calendar event on the dedicated HearMe sessions calendar with a Meet link, the stable `/j/<token>` join link resolves to it, a calendar sync failure never un-confirms the paid booking, and retries/reconciliation recover a transient Google failure.
- [ ] Design it (spec): `/architect google calendar & meet integration`

### 16. Confirmation email · needs a decision
Send the one email a client gets after booking, carrying everything they need and nothing they didn't type.
**Done when:** the email shows date/time in IST and the client's zone, the join link and a `.ics`, the change policy, a privacy summary, the disclaimer and crisis line, and never includes the note.
- [ ] Design it (spec): `/architect confirmation email`

### 25. Reminder & change emails · needs a decision
The other emails a client gets: a reminder before the session, and a notice when a booking is moved, cancelled, or when she sends help resources.
**Done when:** the 1 hour reminder (plus a 24 hour one for bookings made more than 2 days ahead) sends on time in the client's zone, moved/cancelled/help resources emails fire from the matching action, none include the note, and a reschedule or cancel stops the old reminder.
- [ ] Design it (spec): `/architect reminder & change emails`

## Slice 4: Client self service

Let clients move, cancel and delete without help, and make the retention promise automatic.

### 15. Manage booking · needs a decision
Let a client move, cancel, or delete their own details from a signed link with no login.
**Done when:** the signed link resolves without a login, a move or cancel shows the refund consequence before confirming, the cancellation and refund matrix from the brief is enforced exactly, and "delete my details" removes the encrypted PII per the retention policy.
- [ ] Design it (spec): `/architect manage booking`

### 17. Data retention & deletion jobs · needs a decision
Automatically age out PII on the schedule promised in the privacy copy, and let a client delete sooner.
**Done when:** the note is gone 7 days after the session, name/email/phone 90 days after, the payment reference is kept only as long as required, backups age out within 35 days, and "delete my details" from Manage booking takes effect immediately.
- [ ] Design it (spec): `/architect data retention & deletion jobs`

## Slice 5: Admin, day to day

Give her a secure way in and everything she needs to run a normal day.

### 18. Admin auth & RBAC · needs a decision
Give her a secure way in, with room for a future assistant role that cannot see notes or issue refunds.
**Done when:** passkey or password plus mandatory TOTP is required, sessions use `__Host-` HttpOnly `SameSite=Strict` cookies with the stated idle/absolute expiry, and the OWNER/ASSISTANT role split is enforced even though only OWNER exists today.
- [ ] Design it (spec): `/architect admin auth & RBAC`

### 19. Overview dashboard · needs a decision
Her daily landing screen: what's today, what needs her, how the week is going.
**Done when:** today/week/needs you/fill rate stats, today's timeline with Join Meet, the "needs you" list (retry, mark outcome, refund due) and recent bookings all reflect real data.
- [ ] Design it (spec): `/architect overview dashboard`

### 20. Appointments · needs a decision
Find and manage any booking, with the note protected behind an audited reveal.
**Done when:** the table filters correctly with phone masked, the detail panel shows both time zones/payment ref/calendar event/Meet link, the note stays hidden until "Show note" and that reveal is audit logged, and reschedule/cancel & refund from here follow the same matrix as the client side.
- [ ] Design it (spec): `/architect appointments`

### 21. History · needs a decision
A record of what happened to every booking, including the ones a client later deleted.
**Done when:** the four tabs show correct counts, outcome and payment/refund badges are accurate, and an erased booking still shows as a row marked "Erased" rather than disappearing.
- [ ] Design it (spec): `/architect history`

## Slice 6: Admin settings

Let her change hours, prices and policies herself, and see what happened when.

### 22. Availability settings · needs a decision
Let her control exactly when she can be booked without touching code.
**Done when:** weekly hours with multiple ranges per day, buffer, minimum notice, booking window, max per day, hold length, blocked dates, and which Google calendars count as busy are all editable and immediately reflected in booking step 2.
- [ ] Design it (spec): `/architect availability settings`

### 23. Sessions & pricing settings · needs a decision
Let her control what is bookable and at what price, and the cancellation policy that Manage booking and Appointments enforce.
**Done when:** session types (length, price incl. GST, bookable toggle) and the full cancellation policy are editable, changes apply to new bookings only, and every change is audit logged.
- [ ] Design it (spec): `/architect sessions & pricing settings`

### 26. Audit log & settings · needs a decision
Her record of sensitive actions, and the settings page for the Google connection and account security.
**Done when:** the audit log lists logins, note and phone reveals, refunds, price and policy changes and exports (read only), Settings shows Google connection health with connect/reconnect, passkeys/2FA and active sessions with "sign out everywhere", and a disconnected Google pauses public booking with a visible banner.
- [ ] Design it (spec): `/architect audit log & settings`

## Slice 7: Public site & safety

The public face and the safety net, built last on top of a booking flow that already works end to end. Public launch follows this slice.

### 7. Landing page (desktop & phone) · needs a decision
The public facing page that explains the service, sets expectations, and drives booking, responsive from phone to desktop with a sticky booking bar on phone.
**Done when:** every section in the brief renders (hero, trust pills, what you can bring, is/isn't, how it works, pricing, privacy, safety, FAQ, footer disclaimer), the positioning copy appears before any payment entry point, and it passes a basic SEO/meta check.
- [ ] Design it (spec): `/architect landing page`

### 8. Help now page · needs a decision
A fast, always reachable page with the four helplines and guidance for someone worried about another person.
**Done when:** the page is reachable from the footer and the booking flow, lists all four numbers correctly, and the first number is visible without scrolling on phone.
- [ ] Design it (spec): `/architect help now page`

### 24. Boundaries & safety guide · needs a decision
Give her the three zone guide, the crisis protocol, and a one click way to send pre-written help resources to a client, right inside the tool she already uses.
**Done when:** the three zones with their "say" phrases, the crisis protocol steps, the words to use/avoid list, and a working "send help resources" action (which also triggers the refund per the matrix) are all present.
- [ ] Design it (spec): `/architect boundaries & safety guide`

### 27. Privacy friendly analytics · needs a decision
Measure whether the landing page turns visitors into booked sessions, without cookies or personal data.
**Done when:** page views and the funnel up to slot selection are counted in aggregate with no cookies and no consent banner needed, nothing is tracked after a slot is chosen, and slot to paid conversion is read from booking data instead.
- [ ] Design it (spec): `/architect privacy friendly analytics`

## Launch

Production setup and sign off, done once the product works end to end and before the first real client pays.

### 28. Launch readiness · needs a decision
Get production ready for real clients and real money: the live domain, email that actually reaches inboxes, a video account that can't record, live payments, and every promise in the privacy copy actually configured.
**Done when:** the production domains resolve over HTTPS with email authentication passing; the Google account used for sessions has recording, transcripts and AI notes switched off for the whole organisation; hosting is on a plan that permits commercial use; database backup history is capped at 35 days or less; live payment keys are approved and a real ₹1 test payment is refunded cleanly; preview environments hold no real client data; and the lawyer and CA reviews in the spec are signed off.
- [ ] Design it (spec): `/architect launch readiness`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Client accounts**: login and saved history for clients · needs a decision
- **Packages & gift sessions**: bundles and gifting · needs a decision
- **WhatsApp reminders**: reminders outside email · needs a decision
- **Hindi**: a second language · needs a decision
- **Multiple listeners**: more than one person offering sessions · needs a decision
- **International payments**: payment providers beyond Razorpay India · needs a decision
- **Dedicated key management service**: move the encryption key from an environment variable to a managed key service with rotation (spec 0001 follow up) · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies, so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it`, `Test it`, `Review it`, `Document it` at GA) |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is**; `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; at `GA` the suggested point to call it done is after `/test`; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow** (header line) is the project default, `GA`: after `/develop`, `/check verify`, `/test`, a fresh model `/check review`, then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
