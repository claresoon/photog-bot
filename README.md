# photog-bot

Rostering support for the Churchlife photography ministry: a Telegram bot
that collects monthly availability from crew, and a dashboard ICs use to
see who's available and manage the crew list. It does not build the
roster — that stays a human decision in a Google Sheet. See
[`SPEC.md`](./SPEC.md) for the full design.

## Structure

```
apps/bot/         grammY Telegram bot (onboarding, availability, reminders)
apps/dashboard/   Next.js dashboard for ICs (Telegram Login Widget auth)
packages/shared/  shared TS types, date utils, constants
supabase/         migrations + seed for the Postgres schema
```

pnpm workspaces, no build orchestration tool — see SPEC.md §12.

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` will get you the right version)
- A [Supabase](https://supabase.com) project
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Setup

1. Install dependencies:

   ```
   pnpm install
   ```

2. Create a Supabase project, then push the schema:

   ```
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   This runs `supabase/migrations/0001_init.sql` and seeds the
   `Churchlife` department (`supabase/seed.sql`). Add your crew/IC list
   afterwards via the dashboard's Crew page (or directly in the `people`
   table for the very first IC, since the dashboard requires an IC to
   log in).

3. Copy `.env.example` to `apps/bot/.env` and `apps/dashboard/.env`, and
   fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase project settings → API
   - `TELEGRAM_BOT_TOKEN` — from BotFather
   - `TELEGRAM_BOT_USERNAME` / `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — your bot's `@username`, no `@`
   - `SESSION_SECRET` — any random 32+ character string

4. Bootstrap the first IC directly in Supabase (chicken-and-egg: the
   dashboard login requires an existing `people` row with `role = 'ic'`
   and a matching `telegram_handle`):

   ```sql
   insert into people (department_id, full_name, telegram_handle, role)
   values (
     (select id from departments where name = 'Churchlife'),
     'Your Name', 'your_telegram_handle', 'ic'
   );
   ```

5. Run the bot and dashboard locally:

   ```
   pnpm dev:bot
   pnpm dev:dashboard
   ```

   The bot uses long polling in development (no public URL needed). For
   production on Railway, set `BOT_WEBHOOK_URL` and `BOT_WEBHOOK_SECRET`
   to switch it to webhook mode.

## Deployment (Railway)

Two services in one Railway project, both built from this same repo and
both pointed at the same Supabase instance. **Do not set a per-service
Root Directory** — this is a pnpm workspace, and narrowing the root
directory breaks pnpm's ability to resolve `packages/shared` during
install. Instead, each app carries its own `railway.json`
(`apps/bot/railway.json`, `apps/dashboard/railway.json`) with the right
build/start commands; point each Railway service at its file via
**Settings → Custom Config File Path**:

- **bot** service → Config File Path: `apps/bot/railway.json`
- **dashboard** service → Config File Path: `apps/dashboard/railway.json`

That's the only setting Railway requires per service beyond env vars —
everything else (build command, start command, watch paths) is defined
in those files and stays in version control.

Env vars (Settings → Variables), per `.env.example`:

- **bot**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_BOT_USERNAME`, and `BOT_WEBHOOK_URL` (set this to the
  Railway-assigned public URL + `/webhook` once the service has a
  domain), optionally `BOT_WEBHOOK_SECRET`.
- **dashboard**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`,
  `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`.

Reminders run via the in-process `node-cron` scheduler in
`apps/bot/src/jobs` (cycle-open on the 1st of the month, weekly nudge
every Monday) — no separate Railway Cron Jobs needed as long as the bot
service stays running.

## Notes on open items

A few things from SPEC.md §14 needed a default to get MVP built; these
are cheap to change later:

- Cycle deadline: 15th of the month, `23:59` in the server's local
  timezone (`packages/shared/src/date-utils.ts`). No weekend/holiday
  shifting.
- Service dates: every Sunday in the cycle month.
- Invite deep-links: generated and copyable from the Crew page in the
  dashboard; an IC sends them manually (Telegram, WhatsApp, etc.) to
  anyone whose handle doesn't match on `/start`.
