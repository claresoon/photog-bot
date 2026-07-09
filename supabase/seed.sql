-- Seed data for local/dev environments. Production: run this once
-- against the linked project to create the department, then add your
-- first IC by hand (see README.md "Setup" step 4) and the rest of the
-- crew via the dashboard's Crew page.

insert into departments (name)
values ('Churchlife')
on conflict (name) do nothing;
