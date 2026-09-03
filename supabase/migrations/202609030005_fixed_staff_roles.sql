-- Keep the two fixed staff accounts aligned across user, mentor, and admin access.

begin;

with fixed_staff as (
  select id
  from auth.users
  where lower(email) in ('alfredsong0930@gmail.com', 'daleyan05@gmail.com')
), required_roles(role) as (
  values
    ('user'::public.app_role),
    ('mentor'::public.app_role),
    ('operations_admin'::public.app_role),
    ('super_admin'::public.app_role)
)
insert into public.user_roles (user_id, role, granted_by)
select fixed_staff.id, required_roles.role, null
from fixed_staff
cross join required_roles
on conflict (user_id, role) do nothing;

commit;
