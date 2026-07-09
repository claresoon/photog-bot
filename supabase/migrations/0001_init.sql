-- Photography ministry rostering system — initial schema.
-- Matches SPEC.md §6. RLS is intentionally left off (see SPEC.md §8):
-- both apps talk to Postgres with the service role key and enforce
-- crew/IC authorization in application code, not in Postgres.

create extension if not exists "pgcrypto";

create table departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table people (
  id                uuid primary key default gen_random_uuid(),
  department_id     uuid not null references departments (id) on delete cascade,
  full_name         text not null,
  telegram_handle   text unique,
  telegram_id       bigint unique,
  invite_code       text unique,
  role              text not null check (role in ('crew', 'ic')),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index people_department_id_idx on people (department_id);
create index people_is_active_idx on people (is_active);

create table availability_cycles (
  id              uuid primary key default gen_random_uuid(),
  department_id   uuid not null references departments (id) on delete cascade,
  cycle_month     date not null,
  opens_at        timestamptz not null,
  deadline_at     timestamptz not null,
  created_at      timestamptz not null default now(),
  unique (department_id, cycle_month)
);

create index availability_cycles_department_id_idx on availability_cycles (department_id);

create table service_dates (
  id            uuid primary key default gen_random_uuid(),
  cycle_id      uuid not null references availability_cycles (id) on delete cascade,
  service_date  date not null,
  label         text,
  unique (cycle_id, service_date)
);

create index service_dates_cycle_id_idx on service_dates (cycle_id);

create table availability_responses (
  id                uuid primary key default gen_random_uuid(),
  cycle_id          uuid not null references availability_cycles (id) on delete cascade,
  person_id         uuid not null references people (id) on delete cascade,
  service_date_id   uuid not null references service_dates (id) on delete cascade,
  is_available      boolean not null,
  note              text,
  submitted_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (person_id, service_date_id)
);

create index availability_responses_cycle_id_idx on availability_responses (cycle_id);
create index availability_responses_person_id_idx on availability_responses (person_id);

create table reminder_log (
  id              uuid primary key default gen_random_uuid(),
  cycle_id        uuid not null references availability_cycles (id) on delete cascade,
  person_id       uuid not null references people (id) on delete cascade,
  reminder_type   text not null check (reminder_type in ('opening', 'weekly_nudge')),
  sent_at         timestamptz not null default now()
);

create index reminder_log_cycle_person_idx on reminder_log (cycle_id, person_id);

-- Keep `updated_at` honest without relying on every write path to set it.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger people_set_updated_at
  before update on people
  for each row execute function set_updated_at();

create trigger availability_responses_set_updated_at
  before update on availability_responses
  for each row execute function set_updated_at();
