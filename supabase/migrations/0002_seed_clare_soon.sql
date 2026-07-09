-- Bootstraps the first IC so dashboard login isn't a chicken-and-egg
-- problem (see README.md "Setup" step 4). Telegram ID supplied directly
-- rather than via handle/invite-code matching, since it's already known.
--
-- Ensures the department exists rather than assuming seed.sql already
-- ran: `supabase db push` (and pasting migrations into the SQL Editor)
-- only applies migrations, not seed.sql — that's only auto-run by
-- `supabase db reset` for local dev.

insert into departments (name)
values ('Churchlife')
on conflict (name) do nothing;

insert into people (department_id, full_name, telegram_id, role)
values (
  (select id from departments where name = 'Churchlife'),
  'Clare Soon Chi Hui',
  483809185,
  'ic'
)
on conflict (telegram_id) do nothing;
