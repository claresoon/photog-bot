# Photography Ministry Rostering System — Spec v1

## 1. Problem & Goal

Availability collection today is manual: ICs individually text each of 30 crew every month. This causes two recurring failures: some crew are forgotten and go long stretches without being rostered, others are over-rostered. It also consumes a large amount of IC time that should go toward actually planning the roster, not chasing people down.

**Goal of this system:** automate availability collection and give ICs a clean view of who's available and how they've responded historically, so they can spend their time planning rather than collating. This system does **not** build the roster for them — that stays a human decision, currently finalized in a Google Sheet.

## 2. Scope

**In scope (MVP):**
- Telegram bot for crew to submit/edit monthly availability
- Automated reminders (opening + weekly nudges)
- Web dashboard for ICs: view availability, view response history, manage crew list, export data

**Explicitly out of scope (MVP):**
- Building/generating the actual roster (stays manual, in Google Sheets)
- Showing the published roster to crew (bot or dashboard)
- Tracking actual "times served" (would require roster data, which isn't in this system yet)
- Multiple departments (only "Churchlife" exists today, but the model won't hardcode a single department)
- Per-service or per-role availability granularity (crew give one availability answer per week, not broken down by which of the multiple services/roles that week)

**Roadmap (post-MVP, not designed in detail here):**
- Link to Google Sheets to pull in actual roster assignments → enables real serve-frequency/fairness tracking
- Show published roster to crew (bot and/or mini-app)
- Telegram Mini-App (richer UI, possibly replacing bot conversation flow)
- Multiple departments
- Swap requests between crew
- Auto-roster suggestions

## 3. Users & Roles

| Role | Count today | Can do |
|---|---|---|
| **Crew** | 30 (growing) | Submit/edit own monthly availability until deadline. View own submission status/history. |
| **IC** | 4 (growing) | Everything crew can do, plus: view all crew's availability & response history, manage the crew list (add/remove/edit people), export data. |

Everyone is already on Telegram. Access is role-gated — no separate registration flow; people are pre-loaded by an IC.

## 4. Core Domain Concepts

- **Cycle**: one month's availability collection window. Opens on the 1st of the month for *next* month's roster, deadline mid-month (2 weeks to respond).
- **Service date**: a date within a cycle that needs a team (weekly — there's a team every week; multiple services/roles happen that week, but the system only tracks one yes/no per week per person, not per-service/per-role).
- **Availability response**: a crew member's available/unavailable answer for a given service date, editable any time until the cycle deadline.
- **History**: for MVP, this means *past response patterns* (did they submit, on time, how often available) — not actual serve counts, since real roster outcomes live in the Google Sheet and aren't fed back into this system yet.

## 5. Design Note: Identity Matching

You proposed matching people by Telegram `@handle` when they first message the bot. This works, but has one real weak spot: **`@username` is optional and mutable in Telegram** — if a crew member has never set one, or changes it, handle-based matching silently fails on `/start`.

**Recommendation:** use `@handle` matching as the convenient default (works for most people, matches what you described), but back it with a **per-person invite deep-link** (`t.me/YourBot?start=<unique_code>`) that an IC can send to anyone whose handle-matching fails or who has no username. The deep-link always works regardless of username state, and once matched, everything downstream keys off the stable numeric `telegram_id`, not the handle. This is a small addition to the plan, not a redesign — flagging it now because it's the kind of thing that's annoying to retrofit after 30 people have already onboarded.

## 6. Data Model (Supabase / Postgres)

```
departments
  id            uuid pk
  name          text                 -- seed: 'Churchlife'
  created_at    timestamptz

people
  id                uuid pk
  department_id     uuid fk -> departments
  full_name         text
  telegram_handle   text unique null    -- without '@', for initial matching
  telegram_id       bigint unique null  -- set once matched; source of truth after that
  invite_code       text unique null    -- fallback deep-link matching
  role              text check in ('crew','ic')
  is_active         boolean default true
  created_at        timestamptz
  updated_at        timestamptz

availability_cycles
  id                uuid pk
  department_id     uuid fk -> departments
  cycle_month       date        -- first day of month being planned
  opens_at          timestamptz
  deadline_at       timestamptz
  created_at        timestamptz

service_dates
  id            uuid pk
  cycle_id      uuid fk -> availability_cycles
  service_date  date
  label         text null     -- e.g. "Sunday service", optional

availability_responses
  id                uuid pk
  cycle_id          uuid fk -> availability_cycles
  person_id         uuid fk -> people
  service_date_id   uuid fk -> service_dates
  is_available      boolean
  note              text null
  submitted_at      timestamptz
  updated_at        timestamptz
  unique(person_id, service_date_id)

reminder_log
  id            uuid pk
  cycle_id      uuid fk -> availability_cycles
  person_id     uuid fk -> people
  reminder_type text check in ('opening','weekly_nudge')
  sent_at       timestamptz
```

This is intentionally small — 34 people, one department, monthly cycles. No need to over-engineer for scale that doesn't exist yet.

## 7. System Architecture

```
┌─────────────┐        ┌──────────────────┐        ┌─────────────┐
│  Telegram    │◄──────►│   Bot Service     │◄──────►│  Supabase   │
│  (crew)      │webhook │  (Node/TS,        │service │  (Postgres) │
└─────────────┘        │   grammY)         │  role  │             │
                        │  - onboarding      │  key   │  RLS: not   │
                        │  - availability    │        │  relied on  │
                        │    conversation    │        │  for MVP    │
                        │  - cron: cycle      │        │  (see §8)   │
                        │    open + reminders │        └──────┬──────┘
                        └──────────────────┘                │
                                                              │ service
┌─────────────┐        ┌──────────────────┐                 │ role key
│  IC browser  │◄──────►│  Dashboard        │◄────────────────┘
│              │ Telegram│  (Next.js)        │
│              │ Login   │  - server actions/│
│              │ Widget  │    route handlers │
└─────────────┘        │    do all DB access│
                        └──────────────────┘

Both services deployed on Railway (same project, two services, both
pointed at the same Supabase instance).
```

**Why one backend service for the bot, and a separate Next.js app for the dashboard (not a third API layer):** at this scale, adding a dedicated API service is pure overhead. The bot talks to Supabase directly (it's a trusted server process). The dashboard's server-side code (route handlers / server actions) talks to Supabase directly too, using the service role key — the key never reaches the browser. Authorization (crew vs IC) is checked in application code against the session, not via Postgres RLS.

## 8. Auth

**Bot (crew & IC on Telegram):** identity is inherent — Telegram already authenticates the user for you. Bot matches `telegram_id` (via handle or invite code, see §5) to a `people` row and treats that as logged in.

**Dashboard (IC only):** [Telegram Login Widget](https://core.telegram.org/widgets/login) — IC clicks "Log in with Telegram," widget returns a signed payload, dashboard server verifies the signature against the bot token, looks up `telegram_id` in `people`, confirms `role = 'ic'`, and issues a signed session cookie (e.g. via `iron-session`). No separate password/account system.

**Why not Postgres RLS as the primary gate:** RLS would need Supabase Auth JWTs with custom `telegram_id` claims, which means minting custom JWTs on every login — solvable, but real added complexity for a 4-IC, 30-crew tool. Application-layer checks in the dashboard's server code are simpler, sufficient, and easy to reason about at this scale. RLS can be layered on later as defense-in-depth if the system grows (more ICs, more departments, more sensitive data) — noting it here so it's a deliberate deferral, not an oversight.

## 9. Notifications

- **Opening (1st of month):** cycle auto-created for next month, message sent to all active crew with a link to submit availability.
- **Weekly nudge:** every week until the deadline, anyone who hasn't fully submitted (missing a response for any service date in the open cycle) gets a reminder DM. `reminder_log` prevents duplicate sends within the same week.
- After the deadline, the cycle closes for edits; dashboard shows the final collated view.

## 10. MVP Feature List

**Bot:**
- `/start` → match by handle or invite code → link `telegram_id`
- Submit/update availability for the open cycle (inline buttons per service date, editable until deadline)
- Confirmation on submit
- Automated opening + weekly reminder jobs

**Dashboard (IC-only):**
- Telegram login
- Current cycle grid: crew × service dates, available/unavailable/no-response
- "Hasn't submitted yet" filtered list
- Per-person history view (past cycles' response patterns)
- CSV export of the current cycle grid
- Crew management: add/edit/deactivate people, set handle/role (so ICs aren't dependent on manual DB edits as the team changes)

## 11. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | shared types between bot/dashboard/DB, small team, good Supabase tooling |
| Bot framework | [grammY](https://grammy.dev) | modern, actively maintained, strong TS support, clean webhook + session handling |
| Dashboard | Next.js (App Router) | server actions give a simple, secure place to do the service-role DB calls; easy Telegram Login Widget integration |
| DB | Supabase (Postgres) | as specified; use Supabase CLI for migrations |
| Hosting | Railway | as specified; two services (bot, dashboard) in one project, both pointed at Supabase |
| Reminders/cron | Railway Cron Jobs (or `node-cron` inside the long-running bot service if simpler to start) | no extra infra needed |
| Session (dashboard) | `iron-session` signed cookie | lightweight, no extra auth provider needed on top of Telegram Login Widget |

## 12. Folder Structure

```
photog-bot/
├── apps/
│   ├── bot/
│   │   ├── src/
│   │   │   ├── handlers/       # /start, availability conversation
│   │   │   ├── jobs/           # cycle-open, weekly-reminder cron
│   │   │   ├── lib/            # supabase client, matching logic
│   │   │   └── index.ts
│   │   └── package.json
│   └── dashboard/
│       ├── app/
│       │   ├── (auth)/login/
│       │   ├── (dashboard)/availability/
│       │   ├── (dashboard)/crew/
│       │   └── api/auth/telegram/callback/
│       ├── lib/
│       └── package.json
├── packages/
│   └── shared/                 # generated Supabase types, date utils, constants
├── supabase/
│   ├── migrations/
│   ├── seed.sql                # departments + initial people list
│   └── config.toml
├── SPEC.md
├── package.json                 # pnpm workspace root
├── pnpm-workspace.yaml
└── README.md
```

pnpm workspaces, no Turborepo for now — two apps and one shared package don't need build orchestration yet; add it later if it earns its keep.

## 13. Build Phases

1. **Foundations** — repo scaffold, Supabase project + migrations, seed `Churchlife` department + your crew/IC list, Railway project with both services wired up, bot registered with BotFather.
2. **Bot MVP** — onboarding/matching, availability submission flow, cycle auto-creation, reminder jobs.
3. **Dashboard MVP** — Telegram login, cycle grid view, non-submitters list, CSV export, crew management.
4. **History view** — per-person past-cycle response patterns.
5. **Roadmap items** as prioritized later (Sheets integration, published roster, mini-app, multi-department).

## 14. Open Items / Things to Confirm Before Building

- Exact deadline mechanics: is it always "15th of the month" or does it shift for weekends/holidays?
- Which weekday(s) count as a "service date" to generate per cycle (assumed: every Sunday — confirm).
- Who sends the initial invite deep-links to crew without a Telegram username, if any (§5).
- Final list of names + Telegram handles (you mentioned collating this).
