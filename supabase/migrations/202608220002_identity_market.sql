-- CampusLoop v2 identity verification and marketplace workflow.

begin;

create type public.identity_application_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.review_decision as enum (
  'approved',
  'rejected'
);

create type public.mentor_status as enum (
  'pending',
  'active',
  'suspended'
);

create type public.market_listing_status as enum (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'suspended',
  'sold_out',
  'archived'
);

create type public.market_order_status as enum (
  'pending_admin_review',
  'awaiting_fees',
  'awaiting_contact_consents',
  'contact_revealed',
  'handover_pending',
  'completed',
  'cancelled',
  'rejected',
  'disputed',
  'refunded'
);

create table public.identity_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 120),
  document_type text not null check (document_type in ('passport', 'national_id', 'student_id')),
  country_code text not null references public.country_currency_rules(country_code),
  status public.identity_application_status not null default 'pending',
  version integer not null default 1 check (version > 0),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index identity_one_pending_per_user_idx
  on public.identity_applications (user_id)
  where status = 'pending';

create index identity_applications_review_queue_idx
  on public.identity_applications (status, submitted_at);

create table public.identity_documents (
  application_id uuid not null references public.identity_applications(id) on delete cascade,
  file_id uuid not null references public.file_assets(id) on delete restrict,
  side text not null default 'primary' check (side in ('primary', 'front', 'back', 'selfie')),
  created_at timestamptz not null default now(),
  primary key (application_id, side),
  unique (file_id)
);

create table public.identity_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.identity_applications(id) on delete cascade,
  application_version integer not null check (application_version > 0),
  decision public.review_decision not null,
  reason text,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  unique (application_id, application_version),
  check (decision = 'approved' or char_length(trim(coalesce(reason, ''))) >= 5)
);

create table public.mentor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status public.mentor_status not null default 'pending',
  bio text not null default '' check (char_length(bio) <= 1000),
  major_categories text[] not null default '{}',
  specialties text[] not null default '{}',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and verified_at is not null and verified_by is not null) or status <> 'active')
);

create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  address_id uuid not null references public.addresses(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 120),
  category text not null check (char_length(trim(category)) between 1 and 60),
  condition text not null check (condition in ('new', 'like_new', 'good', 'fair')),
  description text not null default '' check (char_length(description) between 1 and 3000),
  price_minor bigint not null check (price_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  country_code text not null references public.country_currency_rules(country_code),
  city text not null check (char_length(trim(city)) between 1 and 120),
  quantity integer not null default 1 check (quantity between 1 and 100),
  available_quantity integer not null default 1 check (available_quantity between 0 and 100),
  delivery_methods text[] not null default '{}',
  status public.market_listing_status not null default 'pending_review',
  version integer not null default 1 check (version > 0),
  legacy_source text,
  legacy_id text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (country_code, currency_code)
    references public.country_currency_rules(country_code, currency_code),
  check (available_quantity <= quantity),
  check (coalesce(cardinality(delivery_methods), 0) between 1 and 4),
  unique (legacy_source, legacy_id)
);

create index market_listings_public_feed_idx
  on public.market_listings (country_code, city, category, created_at desc)
  where status = 'approved' and available_quantity > 0;

create index market_listings_seller_idx
  on public.market_listings (seller_id, created_at desc);

create table public.market_listing_media (
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  file_id uuid not null references public.file_assets(id) on delete restrict,
  sort_order smallint not null check (sort_order between 0 and 5),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  created_at timestamptz not null default now(),
  primary key (listing_id, sort_order),
  unique (file_id)
);

create table public.market_listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  listing_version integer not null check (listing_version > 0),
  decision public.review_decision not null,
  reason text,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  unique (listing_id, listing_version),
  check (decision = 'approved' or char_length(trim(coalesce(reason, ''))) >= 5)
);

create table public.market_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 100),
  listing_title_snapshot text not null,
  unit_price_minor bigint not null check (unit_price_minor > 0),
  subtotal_minor bigint not null check (subtotal_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  country_code text not null references public.country_currency_rules(country_code),
  city text not null,
  buyer_fee_bps integer not null check (buyer_fee_bps between 0 and 10000),
  seller_fee_bps integer not null check (seller_fee_bps between 0 and 10000),
  buyer_fee_minor bigint not null check (buyer_fee_minor >= 0),
  seller_fee_minor bigint not null check (seller_fee_minor >= 0),
  status public.market_order_status not null default 'pending_admin_review',
  version integer not null default 1 check (version > 0),
  idempotency_key uuid not null,
  contact_revealed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (country_code, currency_code)
    references public.country_currency_rules(country_code, currency_code),
  check (buyer_id <> seller_id),
  check (subtotal_minor = unit_price_minor * quantity),
  unique (buyer_id, idempotency_key)
);

create index market_orders_buyer_idx on public.market_orders (buyer_id, created_at desc);
create index market_orders_seller_idx on public.market_orders (seller_id, created_at desc);
create index market_orders_review_queue_idx on public.market_orders (status, created_at)
  where status = 'pending_admin_review';

create table public.market_order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.market_orders(id) on delete cascade,
  order_version integer not null check (order_version > 0),
  decision public.review_decision not null,
  reason text,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  unique (order_id, order_version),
  check (decision = 'approved' or char_length(trim(coalesce(reason, ''))) >= 5)
);

create table public.market_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.market_orders(id) on delete cascade,
  from_status public.market_order_status,
  to_status public.market_order_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index market_order_events_order_idx on public.market_order_events (order_id, created_at);

create table public.market_contact_consents (
  order_id uuid not null references public.market_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (order_id, user_id)
);

create trigger identity_applications_set_updated_at
  before update on public.identity_applications
  for each row execute function public.set_updated_at();

create trigger mentor_profiles_set_updated_at
  before update on public.mentor_profiles
  for each row execute function public.set_updated_at();

create trigger market_listings_set_updated_at
  before update on public.market_listings
  for each row execute function public.set_updated_at();

create trigger market_orders_set_updated_at
  before update on public.market_orders
  for each row execute function public.set_updated_at();

create or replace function public.is_identity_verified(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id is not null and exists (
    select 1
    from public.identity_applications
    where user_id = target_user_id
      and status = 'approved'
  );
$$;

create or replace function public.is_active_mentor(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_scope_allowed('account', target_user_id)
     and public.has_role('mentor', target_user_id)
     and public.is_identity_verified(target_user_id)
     and exists (
       select 1 from public.mentor_access_allowlist
       where user_id = target_user_id and active
     )
     and exists (
       select 1 from public.mentor_profiles
       where user_id = target_user_id
         and status = 'active'
     );
$$;

create or replace function public.bind_mentor_account(
  mentor_alias text,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_alias text := lower(trim(mentor_alias));
begin
  if not public.is_super_admin() then
    raise exception 'insufficient_role';
  end if;
  if normalized_alias not in ('lessured', 'lessures') then
    raise exception 'mentor_alias_not_allowed';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'user_not_found';
  end if;
  if exists (
    select 1 from public.mentor_access_allowlist
    where user_id = target_user_id and login_alias <> normalized_alias
  ) then
    raise exception 'user_already_bound_to_mentor_alias';
  end if;

  update public.mentor_access_allowlist
     set user_id = null, bound_at = null, bound_by = null
   where user_id = target_user_id and login_alias <> normalized_alias;
  update public.mentor_access_allowlist
     set user_id = target_user_id,
         bound_at = now(),
         bound_by = auth.uid(),
         active = true
   where login_alias = normalized_alias;
  if not found then
    raise exception 'mentor_alias_not_allowed';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (target_user_id, 'mentor', auth.uid())
  on conflict (user_id, role) do nothing;
  insert into public.mentor_profiles (user_id, status)
  values (target_user_id, 'pending')
  on conflict (user_id) do nothing;

  perform public.write_audit_event(
    'mentor.allowlist_bound', 'mentor_access_allowlist', normalized_alias,
    null, jsonb_build_object('user_id', target_user_id)
  );
end;
$$;

create or replace function public.activate_mentor_account(
  target_user_id uuid,
  mentor_bio text default '',
  mentor_major_categories text[] default '{}',
  mentor_specialties text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'insufficient_role';
  end if;
  if not exists (
    select 1 from public.mentor_access_allowlist
    where user_id = target_user_id and active
  ) then
    raise exception 'mentor_not_allowlisted';
  end if;
  if not public.is_identity_verified(target_user_id) then
    raise exception 'mentor_identity_not_verified';
  end if;
  if char_length(coalesce(mentor_bio, '')) > 1000
     or coalesce(cardinality(mentor_major_categories), 0) > 20
     or coalesce(cardinality(mentor_specialties), 0) > 50 then
    raise exception 'invalid_mentor_profile';
  end if;

  insert into public.mentor_profiles (
    user_id, status, bio, major_categories, specialties, verified_at, verified_by
  ) values (
    target_user_id, 'active', trim(coalesce(mentor_bio, '')),
    coalesce(mentor_major_categories, '{}'), coalesce(mentor_specialties, '{}'),
    now(), auth.uid()
  )
  on conflict (user_id) do update
    set status = 'active',
        bio = excluded.bio,
        major_categories = excluded.major_categories,
        specialties = excluded.specialties,
        verified_at = now(),
        verified_by = auth.uid(),
        updated_at = now();

  perform public.write_audit_event(
    'mentor.activated', 'mentor_profile', target_user_id::text,
    null, jsonb_build_object('user_id', target_user_id)
  );
end;
$$;

create or replace function public.get_market_feed(
  feed_country_code text,
  feed_city text,
  feed_category text default null
)
returns table (
  id uuid,
  seller_id uuid,
  title text,
  category text,
  condition text,
  description text,
  price_minor bigint,
  currency_code text,
  country_code text,
  city text,
  quantity integer,
  available_quantity integer,
  delivery_methods text[],
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id, l.seller_id, l.title, l.category, l.condition, l.description,
    l.price_minor, l.currency_code, l.country_code, l.city, l.quantity,
    l.available_quantity, l.delivery_methods, l.created_at
  from public.market_listings l
  where l.status = 'approved'
    and l.available_quantity > 0
    and l.country_code = upper(trim(feed_country_code))
    and lower(l.city) = lower(trim(feed_city))
    and (
      nullif(trim(coalesce(feed_category, '')), '') is null
      or l.category = trim(feed_category)
    )
  order by l.created_at desc;
$$;

create or replace function public.submit_identity_application(
  legal_name text,
  document_type text,
  country_code text,
  document_file_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_id uuid;
begin
  if not public.is_account_active() then
    raise exception 'account_restricted';
  end if;
  if char_length(trim(coalesce(legal_name, ''))) < 2 then
    raise exception 'invalid_legal_name';
  end if;
  if document_type not in ('passport', 'national_id', 'student_id') then
    raise exception 'invalid_document_type';
  end if;
  if public.currency_for_country(country_code) is null then
    raise exception 'unsupported_country';
  end if;
  if exists (
    select 1 from public.identity_applications
    where user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'identity_application_pending';
  end if;
  if not exists (
    select 1
    from public.file_assets
    where id = document_file_id
      and owner_id = auth.uid()
      and category = 'identity_document'
      and bucket_id = 'private-documents'
      and scan_status <> 'blocked'
  ) then
    raise exception 'identity_document_not_found';
  end if;

  insert into public.identity_applications (
    user_id,
    legal_name,
    document_type,
    country_code
  ) values (
    auth.uid(),
    trim(legal_name),
    document_type,
    upper(trim(country_code))
  ) returning id into application_id;

  insert into public.identity_documents (application_id, file_id)
  values (application_id, document_file_id);

  perform public.write_audit_event(
    'identity.submitted',
    'identity_application',
    application_id::text,
    null,
    jsonb_build_object('user_id', auth.uid(), 'document_type', document_type)
  );
  return application_id;
end;
$$;

create or replace function public.review_identity_application(
  target_application_id uuid,
  expected_version integer,
  review_decision public.review_decision,
  review_reason text default null
)
returns public.identity_application_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.identity_applications%rowtype;
  next_status public.identity_application_status;
begin
  if not public.is_admin() then
    raise exception 'insufficient_role';
  end if;
  select * into application
  from public.identity_applications
  where id = target_application_id
  for update;

  if application.id is null then raise exception 'application_not_found'; end if;
  if application.status <> 'pending' then raise exception 'application_not_pending'; end if;
  if application.version <> expected_version then raise exception 'stale_version'; end if;
  if review_decision = 'rejected' and char_length(trim(coalesce(review_reason, ''))) < 5 then
    raise exception 'reason_too_short';
  end if;
  if review_decision = 'approved' and exists (
    select 1
    from public.identity_documents d
    join public.file_assets f on f.id = d.file_id
    where d.application_id = application.id
      and f.scan_status <> 'passed'
  ) then
    raise exception 'document_scan_not_passed';
  end if;
  if review_decision = 'approved' and not exists (
    select 1
    from public.identity_documents d
    join public.file_assets f on f.id = d.file_id
    where d.application_id = application.id
      and f.scan_status = 'passed'
  ) then
    raise exception 'identity_document_required';
  end if;

  next_status := case when review_decision = 'approved' then 'approved' else 'rejected' end;

  insert into public.identity_reviews (
    application_id,
    application_version,
    decision,
    reason,
    reviewer_id
  ) values (
    application.id,
    application.version,
    review_decision,
    nullif(trim(coalesce(review_reason, '')), ''),
    auth.uid()
  );

  update public.identity_applications
     set status = next_status,
         version = version + 1,
         reviewed_at = now()
   where id = application.id;

  perform public.write_audit_event(
    'identity.reviewed',
    'identity_application',
    application.id::text,
    to_jsonb(application),
    jsonb_build_object('status', next_status, 'reason', review_reason)
  );
  perform public.enqueue_notification(
    application.user_id,
    'identity_reviewed',
    'identity-reviewed-' || application.id::text || '-' || application.version::text,
    case when next_status = 'approved' then '实名认证已通过' else '实名认证未通过' end,
    coalesce(review_reason, ''),
    jsonb_build_object('application_id', application.id, 'status', next_status)
  );
  return next_status;
end;
$$;

create or replace function public.submit_market_listing(
  listing_address_id uuid,
  listing_title text,
  listing_category text,
  listing_condition text,
  listing_description text,
  listing_price_minor bigint,
  listing_quantity integer,
  listing_delivery_methods text[],
  image_file_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_address public.addresses%rowtype;
  listing_id uuid;
  image_id uuid;
  image_index integer := 0;
begin
  if not public.is_scope_allowed('market') then raise exception 'market_access_restricted'; end if;
  select * into selected_address
  from public.addresses
  where id = listing_address_id and user_id = auth.uid();
  if selected_address.id is null then raise exception 'address_not_found'; end if;
  if char_length(trim(coalesce(listing_title, ''))) not between 2 and 120 then raise exception 'invalid_title'; end if;
  if char_length(trim(coalesce(listing_description, ''))) not between 1 and 3000 then raise exception 'invalid_description'; end if;
  if listing_condition not in ('new', 'like_new', 'good', 'fair') then raise exception 'invalid_condition'; end if;
  if listing_price_minor <= 0 then raise exception 'invalid_price'; end if;
  if listing_quantity not between 1 and 100 then raise exception 'invalid_quantity'; end if;
  if coalesce(cardinality(listing_delivery_methods), 0) not between 1 and 4 then raise exception 'invalid_delivery_methods'; end if;
  if coalesce(cardinality(image_file_ids), 0) not between 1 and 6 then raise exception 'invalid_image_count'; end if;
  if exists (
    select 1
    from unnest(image_file_ids) requested(file_id)
    left join public.file_assets f on f.id = requested.file_id
    where f.id is null
       or f.owner_id <> auth.uid()
       or f.category <> 'market_image'
       or f.scan_status = 'blocked'
  ) then raise exception 'invalid_market_image'; end if;

  insert into public.market_listings (
    seller_id,
    address_id,
    title,
    category,
    condition,
    description,
    price_minor,
    currency_code,
    country_code,
    city,
    quantity,
    available_quantity,
    delivery_methods
  ) values (
    auth.uid(),
    selected_address.id,
    trim(listing_title),
    trim(listing_category),
    listing_condition,
    trim(listing_description),
    listing_price_minor,
    selected_address.currency_code,
    selected_address.country_code,
    selected_address.city,
    listing_quantity,
    listing_quantity,
    listing_delivery_methods
  ) returning id into listing_id;

  foreach image_id in array image_file_ids loop
    insert into public.market_listing_media (listing_id, file_id, sort_order)
    values (listing_id, image_id, image_index);
    image_index := image_index + 1;
  end loop;

  perform public.write_audit_event(
    'market_listing.submitted',
    'market_listing',
    listing_id::text,
    null,
    jsonb_build_object('seller_id', auth.uid(), 'currency_code', selected_address.currency_code)
  );
  return listing_id;
end;
$$;

create or replace function public.review_market_listing(
  target_listing_id uuid,
  expected_version integer,
  review_decision public.review_decision,
  review_reason text default null
)
returns public.market_listing_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing public.market_listings%rowtype;
  next_status public.market_listing_status;
begin
  if not public.is_admin() then raise exception 'insufficient_role'; end if;
  select * into listing from public.market_listings where id = target_listing_id for update;
  if listing.id is null then raise exception 'listing_not_found'; end if;
  if listing.status <> 'pending_review' then raise exception 'listing_not_pending'; end if;
  if listing.version <> expected_version then raise exception 'stale_version'; end if;
  if review_decision = 'rejected' and char_length(trim(coalesce(review_reason, ''))) < 5 then raise exception 'reason_too_short'; end if;
  if review_decision = 'approved' and exists (
    select 1
    from public.market_listing_media m
    join public.file_assets f on f.id = m.file_id
    where m.listing_id = listing.id and f.scan_status <> 'passed'
  ) then raise exception 'listing_media_scan_not_passed'; end if;
  if review_decision = 'approved' and not exists (
    select 1
    from public.market_listing_media m
    join public.file_assets f on f.id = m.file_id
    where m.listing_id = listing.id and f.scan_status = 'passed'
  ) then raise exception 'listing_media_required'; end if;

  next_status := case when review_decision = 'approved' then 'approved' else 'rejected' end;
  insert into public.market_listing_reviews (
    listing_id, listing_version, decision, reason, reviewer_id
  ) values (
    listing.id, listing.version, review_decision,
    nullif(trim(coalesce(review_reason, '')), ''), auth.uid()
  );
  update public.market_listings
     set status = next_status, version = version + 1, reviewed_at = now()
   where id = listing.id;

  perform public.write_audit_event(
    'market_listing.reviewed', 'market_listing', listing.id::text,
    to_jsonb(listing), jsonb_build_object('status', next_status, 'reason', review_reason)
  );
  perform public.enqueue_notification(
    listing.seller_id,
    'market_listing_reviewed',
    'market-listing-reviewed-' || listing.id::text || '-' || listing.version::text,
    case when next_status = 'approved' then '商品审核已通过' else '商品审核未通过' end,
    coalesce(review_reason, ''),
    jsonb_build_object('listing_id', listing.id, 'status', next_status)
  );
  return next_status;
end;
$$;

create or replace function public.create_market_order(
  target_listing_id uuid,
  order_quantity integer,
  request_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing public.market_listings%rowtype;
  order_id uuid;
  fee_bps integer;
  subtotal bigint;
begin
  if not public.is_scope_allowed('market') then raise exception 'market_access_restricted'; end if;
  if not public.is_identity_verified() then raise exception 'identity_verification_required'; end if;
  if order_quantity not between 1 and 100 then raise exception 'invalid_quantity'; end if;
  if request_idempotency_key is null then raise exception 'idempotency_key_required'; end if;

  select id into order_id
  from public.market_orders
  where buyer_id = auth.uid() and idempotency_key = request_idempotency_key;
  if order_id is not null then return order_id; end if;

  select * into listing from public.market_listings where id = target_listing_id for update;
  if listing.id is null or listing.status <> 'approved' then raise exception 'listing_not_available'; end if;
  if listing.seller_id = auth.uid() then raise exception 'cannot_buy_own_listing'; end if;
  if listing.available_quantity < order_quantity then raise exception 'insufficient_quantity'; end if;
  if not public.is_identity_verified(listing.seller_id) then raise exception 'seller_identity_not_verified'; end if;

  select coalesce((value #>> '{}')::integer, 100)
    into fee_bps
    from public.platform_settings
   where key = 'market_service_fee_bps';
  fee_bps := coalesce(fee_bps, 100);
  subtotal := listing.price_minor * order_quantity;

  insert into public.market_orders (
    listing_id,
    buyer_id,
    seller_id,
    quantity,
    listing_title_snapshot,
    unit_price_minor,
    subtotal_minor,
    currency_code,
    country_code,
    city,
    buyer_fee_bps,
    seller_fee_bps,
    buyer_fee_minor,
    seller_fee_minor,
    idempotency_key
  ) values (
    listing.id,
    auth.uid(),
    listing.seller_id,
    order_quantity,
    listing.title,
    listing.price_minor,
    subtotal,
    listing.currency_code,
    listing.country_code,
    listing.city,
    fee_bps,
    fee_bps,
    (subtotal * fee_bps + 9999) / 10000,
    (subtotal * fee_bps + 9999) / 10000,
    request_idempotency_key
  ) returning id into order_id;

  update public.market_listings
     set available_quantity = available_quantity - order_quantity,
         status = case when available_quantity - order_quantity = 0 then 'sold_out' else status end
   where id = listing.id;

  insert into public.market_order_events (order_id, to_status, actor_id, reason)
  values (order_id, 'pending_admin_review', auth.uid(), 'order_created');
  perform public.write_audit_event(
    'market_order.created', 'market_order', order_id::text, null,
    jsonb_build_object('listing_id', listing.id, 'quantity', order_quantity, 'currency_code', listing.currency_code)
  );
  return order_id;
end;
$$;

create or replace function public.review_market_order(
  target_order_id uuid,
  expected_version integer,
  review_decision public.review_decision,
  review_reason text default null
)
returns public.market_order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.market_orders%rowtype;
  next_status public.market_order_status;
begin
  if not public.is_admin() then raise exception 'insufficient_role'; end if;
  select * into order_row from public.market_orders where id = target_order_id for update;
  if order_row.id is null then raise exception 'order_not_found'; end if;
  if order_row.status <> 'pending_admin_review' then raise exception 'order_not_pending'; end if;
  if order_row.version <> expected_version then raise exception 'stale_version'; end if;
  if review_decision = 'rejected' and char_length(trim(coalesce(review_reason, ''))) < 5 then raise exception 'reason_too_short'; end if;

  next_status := case when review_decision = 'approved' then 'awaiting_fees' else 'rejected' end;
  insert into public.market_order_reviews (
    order_id, order_version, decision, reason, reviewer_id
  ) values (
    order_row.id, order_row.version, review_decision,
    nullif(trim(coalesce(review_reason, '')), ''), auth.uid()
  );
  update public.market_orders set status = next_status, version = version + 1 where id = order_row.id;
  insert into public.market_order_events (order_id, from_status, to_status, actor_id, reason)
  values (order_row.id, order_row.status, next_status, auth.uid(), review_reason);

  if next_status = 'rejected' then
    update public.market_listings
       set available_quantity = least(quantity, available_quantity + order_row.quantity),
           status = case when status = 'sold_out' then 'approved' else status end
     where id = order_row.listing_id;
  end if;

  perform public.write_audit_event(
    'market_order.reviewed', 'market_order', order_row.id::text,
    to_jsonb(order_row), jsonb_build_object('status', next_status, 'reason', review_reason)
  );
  perform public.enqueue_notification(
    order_row.buyer_id,
    'market_order_reviewed',
    'market-order-reviewed-' || order_row.id::text || '-' || order_row.version::text,
    case when next_status = 'awaiting_fees' then '二手订单已通过审核' else '二手订单未通过审核' end,
    coalesce(review_reason, ''),
    jsonb_build_object('order_id', order_row.id, 'status', next_status)
  );
  return next_status;
end;
$$;

alter table public.identity_applications enable row level security;
alter table public.identity_documents enable row level security;
alter table public.identity_reviews enable row level security;
alter table public.mentor_profiles enable row level security;
alter table public.market_listings enable row level security;
alter table public.market_listing_media enable row level security;
alter table public.market_listing_reviews enable row level security;
alter table public.market_orders enable row level security;
alter table public.market_order_reviews enable row level security;
alter table public.market_order_events enable row level security;
alter table public.market_contact_consents enable row level security;

create policy identity_applications_read
  on public.identity_applications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy identity_documents_read
  on public.identity_documents for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.identity_applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  );

create policy identity_reviews_read
  on public.identity_reviews for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.identity_applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  );

create policy mentor_profiles_read
  on public.mentor_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy mentor_profiles_update_own
  on public.mentor_profiles for update to authenticated
  using (user_id = auth.uid() and public.is_active_mentor())
  with check (user_id = auth.uid() and public.is_active_mentor());

create policy market_listings_read
  on public.market_listings for select
  using (
    (status = 'approved' and available_quantity > 0)
    or seller_id = auth.uid()
    or public.is_admin()
  );

create policy market_listing_media_read
  on public.market_listing_media for select
  using (
    exists (
      select 1 from public.market_listings l
      where l.id = listing_id
        and (
          (l.status = 'approved' and l.available_quantity > 0)
          or l.seller_id = auth.uid()
          or public.is_admin()
        )
    )
  );

create policy market_listing_reviews_read
  on public.market_listing_reviews for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.market_listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

create policy market_orders_read
  on public.market_orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

create policy market_order_reviews_read
  on public.market_order_reviews for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.market_orders o
      where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id)
    )
  );

create policy market_order_events_read
  on public.market_order_events for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.market_orders o
      where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id)
    )
  );

create policy market_contact_consents_read
  on public.market_contact_consents for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.market_orders o
      where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id)
    )
  );

revoke all on public.identity_applications from anon, authenticated;
revoke all on public.identity_documents from anon, authenticated;
revoke all on public.identity_reviews from anon, authenticated;
revoke all on public.mentor_profiles from anon, authenticated;
revoke all on public.market_listings from anon, authenticated;
revoke all on public.market_listing_media from anon, authenticated;
revoke all on public.market_listing_reviews from anon, authenticated;
revoke all on public.market_orders from anon, authenticated;
revoke all on public.market_order_reviews from anon, authenticated;
revoke all on public.market_order_events from anon, authenticated;
revoke all on public.market_contact_consents from anon, authenticated;

grant select on public.identity_applications, public.identity_documents, public.identity_reviews to authenticated;
grant select on public.mentor_profiles to authenticated;
grant update (bio, major_categories, specialties) on public.mentor_profiles to authenticated;
-- Public clients receive only the listing/feed columns. The owning address ID,
-- legacy migration fields, and storage object IDs stay behind server APIs.
grant select (
  id, seller_id, title, category, condition, description, price_minor,
  currency_code, country_code, city, quantity, available_quantity,
  delivery_methods, status, version, submitted_at, reviewed_at, created_at,
  updated_at
) on public.market_listings to anon, authenticated;
grant select (listing_id, sort_order, alt_text, created_at)
  on public.market_listing_media to anon, authenticated;
grant select on public.market_listing_reviews, public.market_orders, public.market_order_reviews, public.market_order_events, public.market_contact_consents to authenticated;

revoke all on function public.submit_identity_application(text,text,text,uuid) from public, anon;
revoke all on function public.bind_mentor_account(text,uuid) from public, anon;
revoke all on function public.activate_mentor_account(uuid,text,text[],text[]) from public, anon;
revoke all on function public.get_market_feed(text,text,text) from public, anon;
revoke all on function public.review_identity_application(uuid,integer,public.review_decision,text) from public, anon;
revoke all on function public.submit_market_listing(uuid,text,text,text,text,bigint,integer,text[],uuid[]) from public, anon;
revoke all on function public.review_market_listing(uuid,integer,public.review_decision,text) from public, anon;
revoke all on function public.create_market_order(uuid,integer,uuid) from public, anon;
revoke all on function public.review_market_order(uuid,integer,public.review_decision,text) from public, anon;

grant execute on function public.submit_identity_application(text,text,text,uuid) to authenticated;
grant execute on function public.bind_mentor_account(text,uuid) to authenticated;
grant execute on function public.activate_mentor_account(uuid,text,text[],text[]) to authenticated;
grant execute on function public.get_market_feed(text,text,text) to anon, authenticated;
grant execute on function public.review_identity_application(uuid,integer,public.review_decision,text) to authenticated;
grant execute on function public.submit_market_listing(uuid,text,text,text,text,bigint,integer,text[],uuid[]) to authenticated;
grant execute on function public.review_market_listing(uuid,integer,public.review_decision,text) to authenticated;
grant execute on function public.create_market_order(uuid,integer,uuid) to authenticated;
grant execute on function public.review_market_order(uuid,integer,public.review_decision,text) to authenticated;

commit;
