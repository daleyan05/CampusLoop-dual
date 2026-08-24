-- CampusLoop v2 core schema.
-- This migration intentionally leaves the legacy market_* tables untouched.

begin;

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'user',
  'mentor',
  'operations_admin',
  'super_admin'
);

create type public.restriction_scope as enum (
  'account',
  'market',
  'tutoring',
  'messaging'
);

create type public.file_category as enum (
  'market_image',
  'identity_document',
  'tutoring_request',
  'tutoring_delivery',
  'message_attachment',
  'report_evidence'
);

create type public.file_scan_status as enum (
  'pending',
  'passed',
  'blocked'
);

create type public.outbox_status as enum (
  'pending',
  'processing',
  'delivered',
  'failed'
);

create table public.country_currency_rules (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  minor_unit smallint not null default 2 check (minor_unit between 0 and 4),
  updated_at timestamptz not null default now(),
  unique (country_code, currency_code)
);

insert into public.country_currency_rules (country_code, currency_code, minor_unit) values
  ('AF','AFN',2),('AL','ALL',2),('DZ','DZD',2),('AD','EUR',2),('AO','AOA',2),('AG','XCD',2),('AR','ARS',2),('AM','AMD',2),('AU','AUD',2),('AT','EUR',2),('AZ','AZN',2),
  ('BS','BSD',2),('BH','BHD',3),('BD','BDT',2),('BB','BBD',2),('BY','BYN',2),('BE','EUR',2),('BZ','BZD',2),('BJ','XOF',0),('BT','BTN',2),('BO','BOB',2),('BA','BAM',2),('BW','BWP',2),('BR','BRL',2),('BN','BND',2),('BG','EUR',2),('BF','XOF',0),('BI','BIF',0),
  ('CV','CVE',2),('KH','KHR',2),('CM','XAF',0),('CA','CAD',2),('CF','XAF',0),('TD','XAF',0),('CL','CLP',0),('CN','CNY',2),('CO','COP',2),('KM','KMF',0),('CG','XAF',0),('CR','CRC',2),('CI','XOF',0),('HR','EUR',2),('CU','CUP',2),('CY','EUR',2),('CZ','CZK',2),('CD','CDF',2),
  ('DK','DKK',2),('DJ','DJF',0),('DM','XCD',2),('DO','DOP',2),('EC','USD',2),('EG','EGP',2),('SV','USD',2),('GQ','XAF',0),('ER','ERN',2),('EE','EUR',2),('SZ','SZL',2),('ET','ETB',2),
  ('FJ','FJD',2),('FI','EUR',2),('FR','EUR',2),('GA','XAF',0),('GM','GMD',2),('GE','GEL',2),('DE','EUR',2),('GH','GHS',2),('GR','EUR',2),('GD','XCD',2),('GT','GTQ',2),('GN','GNF',0),('GW','XOF',0),('GY','GYD',2),
  ('HT','HTG',2),('HN','HNL',2),('HU','HUF',2),('IS','ISK',0),('IN','INR',2),('ID','IDR',2),('IR','IRR',2),('IQ','IQD',3),('IE','EUR',2),('IL','ILS',2),('IT','EUR',2),
  ('JM','JMD',2),('JP','JPY',0),('JO','JOD',3),('KZ','KZT',2),('KE','KES',2),('KI','AUD',2),('KP','KPW',2),('KR','KRW',0),('KW','KWD',3),('KG','KGS',2),
  ('LA','LAK',2),('LV','EUR',2),('LB','LBP',2),('LS','LSL',2),('LR','LRD',2),('LY','LYD',3),('LI','CHF',2),('LT','EUR',2),('LU','EUR',2),
  ('MG','MGA',2),('MW','MWK',2),('MY','MYR',2),('MV','MVR',2),('ML','XOF',0),('MT','EUR',2),('MH','USD',2),('MR','MRU',2),('MU','MUR',2),('MX','MXN',2),('FM','USD',2),('MD','MDL',2),('MC','EUR',2),('MN','MNT',2),('ME','EUR',2),('MA','MAD',2),('MZ','MZN',2),('MM','MMK',2),
  ('NA','NAD',2),('NR','AUD',2),('NP','NPR',2),('NL','EUR',2),('NZ','NZD',2),('NI','NIO',2),('NE','XOF',0),('NG','NGN',2),('MK','MKD',2),('NO','NOK',2),
  ('OM','OMR',3),('PK','PKR',2),('PW','USD',2),('PA','PAB',2),('PG','PGK',2),('PY','PYG',0),('PE','PEN',2),('PH','PHP',2),('PL','PLN',2),('PT','EUR',2),('QA','QAR',2),
  ('RO','RON',2),('RU','RUB',2),('RW','RWF',0),('KN','XCD',2),('LC','XCD',2),('VC','XCD',2),('WS','WST',2),('SM','EUR',2),('ST','STN',2),('SA','SAR',2),('SN','XOF',0),('RS','RSD',2),('SC','SCR',2),('SL','SLE',2),('SG','SGD',2),('SK','EUR',2),('SI','EUR',2),('SB','SBD',2),('SO','SOS',2),('ZA','ZAR',2),('SS','SSP',2),('ES','EUR',2),('LK','LKR',2),('SD','SDG',2),('SR','SRD',2),('SE','SEK',2),('CH','CHF',2),('SY','SYP',2),
  ('TJ','TJS',2),('TZ','TZS',2),('TH','THB',2),('TL','USD',2),('TG','XOF',0),('TO','TOP',2),('TT','TTD',2),('TN','TND',3),('TR','TRY',2),('TM','TMT',2),('TV','AUD',2),
  ('UG','UGX',0),('UA','UAH',2),('AE','AED',2),('GB','GBP',2),('US','USD',2),('UY','UYU',2),('UZ','UZS',2),('VU','VUV',0),('VE','VES',2),('VN','VND',0),('YE','YER',2),('ZM','ZMW',2),('ZW','ZWG',2),('PS','ILS',2),('VA','EUR',2);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  avatar_path text,
  locale text not null default 'zh-CN' check (char_length(locale) between 2 and 16),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_private_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  phone text,
  last_seen_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.mentor_access_allowlist (
  login_alias text primary key check (login_alias in ('lessured', 'lessures')),
  user_id uuid unique references public.profiles(id) on delete cascade,
  active boolean not null default true,
  bound_at timestamptz,
  bound_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((user_id is null and bound_at is null and bound_by is null)
      or (user_id is not null and bound_at is not null and bound_by is not null))
);

insert into public.mentor_access_allowlist (login_alias)
values ('lessured'), ('lessures')
on conflict (login_alias) do nothing;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 40),
  recipient_name text check (recipient_name is null or char_length(trim(recipient_name)) between 1 and 80),
  country_code text not null references public.country_currency_rules(country_code),
  region text,
  city text not null check (char_length(trim(city)) between 1 and 120),
  address_line text not null check (char_length(trim(address_line)) between 1 and 240),
  postal_code text,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (country_code, currency_code)
    references public.country_currency_rules(country_code, currency_code)
);

create unique index addresses_one_default_per_user
  on public.addresses (user_id)
  where is_default;

create index addresses_user_id_idx on public.addresses (user_id, created_at desc);

create table public.account_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope public.restriction_scope not null default 'account',
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete restrict,
  revoke_reason text,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check ((revoked_at is null and revoked_by is null) or (revoked_at is not null and revoked_by is not null))
);

create index account_restrictions_active_lookup_idx
  on public.account_restrictions (user_id, scope, starts_at, ends_at)
  where revoked_at is null;

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.app_role,
  action text not null check (char_length(action) between 3 and 100),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id text not null,
  request_id uuid not null default gen_random_uuid(),
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, created_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id, created_at desc);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (char_length(topic) between 2 and 100),
  event_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status public.outbox_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index outbox_events_pending_idx on public.outbox_events (available_at, created_at)
  where status in ('pending', 'failed');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null,
  type text not null check (char_length(type) between 2 and 80),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc)
  where read_at is null;

create table public.file_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category public.file_category not null,
  bucket_id text not null check (bucket_id in ('market-media', 'private-documents')),
  object_path text not null,
  original_name text not null check (char_length(original_name) between 1 and 240),
  mime_type text not null check (char_length(mime_type) between 3 and 120),
  size_bytes bigint not null check (size_bytes between 1 and 104857600),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  scan_status public.file_scan_status not null default 'pending',
  scan_detail text,
  scanned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path),
  check (
    (category = 'market_image' and bucket_id = 'market-media')
    or (category <> 'market_image' and bucket_id = 'private-documents')
  )
);

create index file_assets_owner_idx on public.file_assets (owner_id, created_at desc);
create index file_assets_scan_idx on public.file_assets (scan_status, created_at);

create table public.platform_settings (
  key text primary key check (char_length(key) between 3 and 80),
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value, is_public, description) values
  ('market_service_fee_bps', '100'::jsonb, true, 'Buyer and seller service fee in basis points'),
  ('support_contact', '"support@campusloopapp.net"'::jsonb, true, 'Public support email'),
  ('identity_required_for_trade', 'true'::jsonb, true, 'Require approved identity before orders'),
  ('identity_required_for_quote_acceptance', 'true'::jsonb, true, 'Require approved identity before selecting a tutoring quote');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger user_private_profiles_set_updated_at
  before update on public.user_private_profiles
  for each row execute function public.set_updated_at();

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

create or replace function public.currency_for_country(target_country_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select currency_code
  from public.country_currency_rules
  where country_code = upper(trim(target_country_code));
$$;

create or replace function public.prepare_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_currency text;
  has_other_default boolean;
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;

  select public.currency_for_country(new.country_code) into expected_currency;
  if expected_currency is null then
    raise exception 'unsupported_country';
  end if;
  new.country_code := upper(trim(new.country_code));
  new.currency_code := expected_currency;

  -- The default-switch update below fires this trigger again. Let that
  -- internal row update pass through without trying to re-elect a default.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  select exists (
    select 1
    from public.addresses
    where user_id = new.user_id
      and id <> new.id
      and is_default
  ) into has_other_default;

  -- Every account keeps one usable default address. The first address becomes
  -- default automatically, and a user cannot remove the last default by
  -- toggling the flag off.
  if not coalesce(new.is_default, false) and not coalesce(has_other_default, false) then
    new.is_default := true;
  end if;

  if new.is_default then
    update public.addresses
       set is_default = false, updated_at = now()
     where user_id = new.user_id
       and id <> new.id
       and is_default;
  end if;
  return new;
end;
$$;

create trigger addresses_prepare
  before insert or update of country_code, is_default on public.addresses
  for each row execute function public.prepare_address();

create or replace function public.restore_default_address_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.addresses where user_id = old.user_id and is_default
  ) then
    update public.addresses
       set is_default = true, updated_at = now()
     where id = (
       select id
       from public.addresses
       where user_id = old.user_id
       order by created_at asc, id asc
       limit 1
     );
  end if;
  return old;
end;
$$;

create trigger addresses_restore_default_after_delete
  after delete on public.addresses
  for each row execute function public.restore_default_address_after_delete();

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fallback_name text;
begin
  fallback_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    nullif(new.phone, ''),
    'CampusLoop User'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(fallback_name, 60))
  on conflict (id) do nothing;

  insert into public.user_private_profiles (user_id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (user_id) do update
    set email = excluded.email,
        phone = excluded.phone,
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_campusloop_auth_user_created on auth.users;
drop trigger if exists on_campusloop_auth_user_updated on auth.users;
create trigger on_campusloop_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_created();
create trigger on_campusloop_auth_user_updated
  after update of email, phone, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_created();

create or replace function public.has_role(required_role public.app_role, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id is not null and exists (
    select 1
    from public.user_roles
    where user_id = target_user_id
      and role = required_role
  );
$$;

create or replace function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('operations_admin', target_user_id)
      or public.has_role('super_admin', target_user_id);
$$;

create or replace function public.is_super_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('super_admin', target_user_id);
$$;

create or replace function public.is_scope_allowed(
  target_scope public.restriction_scope,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id is not null
     and not exists (
       select 1
       from public.account_restrictions
       where user_id = target_user_id
         and revoked_at is null
         and starts_at <= now()
         and (ends_at is null or ends_at > now())
         and scope in ('account'::public.restriction_scope, target_scope)
     );
$$;

create or replace function public.is_account_active(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_scope_allowed('account', target_user_id);
$$;

-- A restricted administrator must not retain a bypass through admin RLS
-- policies or management RPCs. This replacement is defined after the scope
-- predicate so the dependency is present during migration.
create or replace function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_scope_allowed('account', target_user_id)
     and (
       public.has_role('operations_admin', target_user_id)
       or public.has_role('super_admin', target_user_id)
     );
$$;

create or replace function public.is_super_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_scope_allowed('account', target_user_id)
     and public.has_role('super_admin', target_user_id);
$$;

create or replace function public.current_actor_role()
returns public.app_role
language sql
stable
security definer
  set search_path = ''
as $$
  select case
    when public.is_super_admin() then 'super_admin'::public.app_role
    when public.is_admin() then 'operations_admin'::public.app_role
    when public.is_scope_allowed('account') and public.has_role('mentor') then 'mentor'::public.app_role
    else 'user'::public.app_role
  end;
$$;

create or replace function public.write_audit_event(
  event_action text,
  event_entity_type text,
  event_entity_id text,
  event_before_data jsonb default null,
  event_after_data jsonb default null,
  event_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_id bigint;
begin
  insert into public.audit_events (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  ) values (
    auth.uid(),
    case when auth.uid() is null then null else public.current_actor_role() end,
    event_action,
    event_entity_type,
    event_entity_id,
    event_before_data,
    event_after_data,
    coalesce(event_metadata, '{}'::jsonb)
  ) returning id into result_id;
  return result_id;
end;
$$;

create or replace function public.enqueue_notification(
  target_user_id uuid,
  notification_type text,
  notification_event_key text,
  notification_title text,
  notification_body text default '',
  notification_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_id uuid;
begin
  insert into public.notifications (user_id, event_key, type, title, body, payload)
  values (
    target_user_id,
    notification_event_key,
    notification_type,
    notification_title,
    coalesce(notification_body, ''),
    coalesce(notification_payload, '{}'::jsonb)
  )
  on conflict (user_id, event_key) do update
    set title = excluded.title,
        body = excluded.body,
        payload = excluded.payload
  returning id into result_id;

  insert into public.outbox_events (topic, event_key, payload)
  values (
    'notification.created',
    notification_event_key || ':' || target_user_id::text,
    jsonb_build_object('notification_id', result_id, 'user_id', target_user_id)
  )
  on conflict (event_key) do nothing;
  return result_id;
end;
$$;

create or replace function public.set_user_role(
  target_user_id uuid,
  target_role public.app_role,
  should_have_role boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_roles jsonb;
  after_roles jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'insufficient_role';
  end if;
  if target_role = 'user' and not should_have_role then
    raise exception 'base_user_role_cannot_be_removed';
  end if;
  if target_role = 'mentor' and should_have_role and not exists (
    select 1
    from public.mentor_access_allowlist
    where user_id = target_user_id and active
  ) then
    raise exception 'mentor_not_allowlisted';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'user_not_found';
  end if;

  select coalesce(jsonb_agg(role order by role), '[]'::jsonb)
    into before_roles
    from public.user_roles
   where user_id = target_user_id;

  if should_have_role then
    insert into public.user_roles (user_id, role, granted_by)
    values (target_user_id, target_role, auth.uid())
    on conflict do nothing;
  else
    delete from public.user_roles
     where user_id = target_user_id
       and role = target_role;
  end if;

  select coalesce(jsonb_agg(role order by role), '[]'::jsonb)
    into after_roles
    from public.user_roles
   where user_id = target_user_id;

  perform public.write_audit_event(
    'user.role_changed',
    'user',
    target_user_id::text,
    jsonb_build_object('roles', before_roles),
    jsonb_build_object('roles', after_roles)
  );
end;
$$;

create or replace function public.ban_user_account(
  target_user_id uuid,
  ban_reason text,
  ban_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  restriction_id uuid;
begin
  if not public.is_admin() then
    raise exception 'insufficient_role';
  end if;
  if (public.has_role('operations_admin', target_user_id)
      or public.has_role('super_admin', target_user_id))
     and not public.is_super_admin() then
    raise exception 'admin_target_requires_super_admin';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'cannot_ban_self';
  end if;
  if char_length(trim(coalesce(ban_reason, ''))) < 5 then
    raise exception 'reason_too_short';
  end if;
  if ban_ends_at is not null and ban_ends_at <= now() then
    raise exception 'invalid_end_time';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'user_not_found';
  end if;
  if exists (
    select 1 from public.account_restrictions
    where user_id = target_user_id
      and scope = 'account'
      and revoked_at is null
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
  ) then
    raise exception 'account_already_banned';
  end if;

  update public.account_restrictions
     set revoked_at = now(),
         revoked_by = auth.uid(),
         revoke_reason = 'expired_before_new_restriction'
   where user_id = target_user_id
     and scope = 'account'
     and revoked_at is null
     and ends_at is not null
     and ends_at <= now();

  insert into public.account_restrictions (
    user_id,
    scope,
    reason,
    ends_at,
    created_by
  ) values (
    target_user_id,
    'account',
    trim(ban_reason),
    ban_ends_at,
    auth.uid()
  ) returning id into restriction_id;

  perform public.write_audit_event(
    'user.banned',
    'account_restriction',
    restriction_id::text,
    null,
    jsonb_build_object(
      'user_id', target_user_id,
      'scope', 'account',
      'reason', trim(ban_reason),
      'ends_at', ban_ends_at
    )
  );
  perform public.enqueue_notification(
    target_user_id,
    'account_restricted',
    'account-restricted-' || restriction_id::text,
    '账户已被限制',
    trim(ban_reason),
    jsonb_build_object('restriction_id', restriction_id, 'ends_at', ban_ends_at)
  );
  return restriction_id;
end;
$$;

create or replace function public.unban_user_account(
  target_user_id uuid,
  unban_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if not public.is_admin() then
    raise exception 'insufficient_role';
  end if;
  if (public.has_role('operations_admin', target_user_id)
      or public.has_role('super_admin', target_user_id))
     and not public.is_super_admin() then
    raise exception 'admin_target_requires_super_admin';
  end if;
  if char_length(trim(coalesce(unban_reason, ''))) < 5 then
    raise exception 'reason_too_short';
  end if;

  update public.account_restrictions
     set revoked_at = now(),
         revoked_by = auth.uid(),
         revoke_reason = trim(unban_reason)
   where user_id = target_user_id
     and scope = 'account'
     and revoked_at is null
     and starts_at <= now()
     and (ends_at is null or ends_at > now());
  get diagnostics changed_count = row_count;

  if changed_count = 0 then
    raise exception 'active_restriction_not_found';
  end if;

  perform public.write_audit_event(
    'user.unbanned',
    'user',
    target_user_id::text,
    null,
    jsonb_build_object('reason', trim(unban_reason), 'restrictions_revoked', changed_count)
  );
  perform public.enqueue_notification(
    target_user_id,
    'account_restored',
    'account-restored-' || gen_random_uuid()::text,
    '账户限制已解除',
    trim(unban_reason)
  );
  return changed_count;
end;
$$;

create or replace function public.set_platform_setting(
  p_setting_key text,
  p_setting_value jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_value jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'insufficient_role';
  end if;
  if char_length(trim(coalesce(p_setting_key, ''))) not between 3 and 80
     or p_setting_value is null then
    raise exception 'invalid_setting';
  end if;

  if p_setting_key = 'market_service_fee_bps' then
    if jsonb_typeof(p_setting_value) <> 'number'
       or (p_setting_value #>> '{}')::numeric not between 0 and 10000 then
      raise exception 'invalid_fee_setting';
    end if;
  elsif p_setting_key = 'support_contact' then
    if jsonb_typeof(p_setting_value) <> 'string'
       or char_length(trim(p_setting_value #>> '{}')) not between 3 and 240 then
      raise exception 'invalid_support_contact';
    end if;
  elsif p_setting_key in ('identity_required_for_trade', 'identity_required_for_quote_acceptance') then
    if jsonb_typeof(p_setting_value) <> 'boolean' then
      raise exception 'invalid_boolean_setting';
    end if;
  else
    raise exception 'setting_not_allowed';
  end if;

  select ps.value into before_value
  from public.platform_settings ps
  where ps.key = p_setting_key
  for update;

  if before_value is null then
    insert into public.platform_settings (key, value, updated_by)
    values (p_setting_key, p_setting_value, auth.uid());
  else
    update public.platform_settings
       set value = p_setting_value,
           updated_by = auth.uid(),
           updated_at = now()
     where key = p_setting_key;
  end if;

  perform public.write_audit_event(
    'platform_setting.updated',
    'platform_setting',
    p_setting_key,
    jsonb_build_object('value', before_value),
    jsonb_build_object('value', p_setting_value)
  );
end;
$$;

create or replace function public.mark_notification_read(target_notification_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_read_at timestamptz;
begin
  update public.notifications
     set read_at = coalesce(read_at, now())
   where id = target_notification_id
     and user_id = auth.uid()
  returning read_at into result_read_at;
  if result_read_at is null then
    raise exception 'notification_not_found';
  end if;
  return result_read_at;
end;
$$;

alter table public.country_currency_rules enable row level security;
alter table public.profiles enable row level security;
alter table public.user_private_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.mentor_access_allowlist enable row level security;
alter table public.addresses enable row level security;
alter table public.account_restrictions enable row level security;
alter table public.audit_events enable row level security;
alter table public.outbox_events enable row level security;
alter table public.notifications enable row level security;
alter table public.file_assets enable row level security;
alter table public.platform_settings enable row level security;

create policy country_currency_rules_read
  on public.country_currency_rules for select
  using (true);

create policy profiles_public_read
  on public.profiles for select
  using (deleted_at is null or public.is_admin());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_account_active())
  with check (id = auth.uid() and deleted_at is null and public.is_account_active());

create policy private_profiles_read
  on public.user_private_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy user_roles_read
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy mentor_access_allowlist_super_admin_read
  on public.mentor_access_allowlist for select to authenticated
  using (public.is_super_admin());

create policy addresses_read
  on public.addresses for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy addresses_insert_own
  on public.addresses for insert to authenticated
  with check (user_id = auth.uid() and public.is_account_active());

create policy addresses_update_own
  on public.addresses for update to authenticated
  using (user_id = auth.uid() and public.is_account_active())
  with check (user_id = auth.uid() and public.is_account_active());

create policy addresses_delete_own
  on public.addresses for delete to authenticated
  using (user_id = auth.uid() and public.is_account_active());

create policy account_restrictions_read
  on public.account_restrictions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy audit_events_super_admin_read
  on public.audit_events for select to authenticated
  using (public.is_super_admin());

create policy notifications_read_own
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy notifications_mark_read_own
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy file_assets_read_owner_or_admin
  on public.file_assets for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy file_assets_insert_own
  on public.file_assets for insert to authenticated
  with check (
    owner_id = auth.uid()
    and split_part(object_path, '/', 1) = auth.uid()::text
    and scan_status = 'pending'
    and public.is_account_active()
  );

create policy platform_settings_read
  on public.platform_settings for select
  using (is_public or public.is_admin());

create policy platform_settings_super_admin_write
  on public.platform_settings for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

revoke all on public.country_currency_rules from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.user_private_profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.mentor_access_allowlist from anon, authenticated;
revoke all on public.addresses from anon, authenticated;
revoke all on public.account_restrictions from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;
revoke all on public.outbox_events from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.file_assets from anon, authenticated;
revoke all on public.platform_settings from anon, authenticated;

grant select on public.country_currency_rules to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (display_name, avatar_path, locale) on public.profiles to authenticated;
grant select on public.user_private_profiles, public.user_roles to authenticated;
grant select on public.mentor_access_allowlist to authenticated;
grant select, insert, update (label, recipient_name, country_code, region, city, address_line, postal_code, is_default), delete on public.addresses to authenticated;
grant select on public.account_restrictions, public.audit_events to authenticated;
grant select on public.notifications to authenticated;
grant select on public.file_assets to authenticated;
grant insert (owner_id, category, bucket_id, object_path, original_name, mime_type, size_bytes)
  on public.file_assets to authenticated;
revoke all on public.platform_settings from authenticated;
grant select on public.platform_settings to anon, authenticated;

revoke all on function public.write_audit_event(text,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.enqueue_notification(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.set_user_role(uuid,public.app_role,boolean) from public, anon;
revoke all on function public.ban_user_account(uuid,text,timestamptz) from public, anon;
revoke all on function public.unban_user_account(uuid,text) from public, anon;
revoke all on function public.set_platform_setting(text,jsonb) from public, anon, authenticated;
revoke all on function public.mark_notification_read(uuid) from public, anon, authenticated;
grant execute on function public.set_user_role(uuid,public.app_role,boolean) to authenticated;
grant execute on function public.ban_user_account(uuid,text,timestamptz) to authenticated;
grant execute on function public.unban_user_account(uuid,text) to authenticated;
grant execute on function public.set_platform_setting(text,jsonb) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;

commit;
