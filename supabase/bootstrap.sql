-- CampusLoop v2 safe bootstrap template.
-- Run only after the corresponding users already exist in Supabase Auth.
-- Replace UUID placeholders with the Auth user IDs. Never put passwords here.

begin;

-- One-time owner step: run this small section as the database owner in the
-- Supabase SQL Editor after the Auth user and profile already exist. It is the
-- only direct role insert in this template, and establishes the first owner.
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000010'::uuid, 'super_admin')
on conflict (user_id, role) do nothing;

commit;

-- Sign in as that super-admin in an authenticated session, then run the rest
-- of this file. Required fixed mentor aliases are seeded by the core migration.
begin;

-- A normal user cannot self-register as mentor.
select public.bind_mentor_account(
  'lessured',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public.bind_mentor_account(
  'lessures',
  '00000000-0000-0000-0000-000000000002'::uuid
);

-- Activate each mentor only after their identity application is approved.
select public.activate_mentor_account(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'CampusLoop Mentor',
  array['business', 'language'],
  array['academic writing']
);
select public.activate_mentor_account(
  '00000000-0000-0000-0000-000000000002'::uuid,
  'CampusLoop Mentor',
  array['business', 'technology'],
  array['research methods']
);

select public.set_user_role(
  '00000000-0000-0000-0000-000000000011'::uuid,
  'operations_admin',
  true
);

commit;

-- Before production use, run:
--   tests/database_contract.sql
-- and verify the anon, authenticated, mentor, operations_admin and
-- super_admin permission matrix in a staging project.
