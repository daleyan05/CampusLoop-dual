-- CampusLoop v2 tutoring requests, quotes, matching, orders, and files.

begin;

create type public.tutoring_request_status as enum (
  'pending_review',
  'open_for_quotes',
  'quote_selected',
  'matched',
  'in_progress',
  'file_review',
  'completed',
  'rejected',
  'cancelled',
  'disputed'
);

create type public.tutoring_quote_status as enum (
  'active',
  'withdrawn',
  'selected',
  'accepted',
  'rejected',
  'expired'
);

create type public.tutoring_selection_status as enum (
  'pending_admin',
  'approved',
  'rejected',
  'cancelled'
);

create type public.tutoring_order_status as enum (
  'awaiting_start',
  'in_progress',
  'file_review',
  'awaiting_student',
  'completed',
  'cancelled',
  'disputed'
);

create type public.tutoring_file_purpose as enum (
  'request_brief',
  'request_supplement',
  'mentor_delivery'
);

create type public.file_review_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.tutoring_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  address_id uuid not null references public.addresses(id) on delete restrict,
  subject text not null check (char_length(trim(subject)) between 1 and 120),
  major_category text not null check (char_length(trim(major_category)) between 1 and 120),
  major text not null check (char_length(trim(major)) between 1 and 120),
  request_type text not null check (request_type in ('essay_structure', 'assignment_support', 'language_polish', 'course_tutoring')),
  mentor_summary text not null check (char_length(trim(mentor_summary)) between 10 and 500),
  brief_private text not null check (char_length(trim(brief_private)) between 10 and 5000),
  country_code text not null references public.country_currency_rules(country_code),
  city text not null check (char_length(trim(city)) between 1 and 120),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  deadline timestamptz not null,
  status public.tutoring_request_status not null default 'pending_review',
  version integer not null default 1 check (version > 0),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (country_code, currency_code)
    references public.country_currency_rules(country_code, currency_code),
  check (deadline > created_at)
);

create index tutoring_requests_review_queue_idx
  on public.tutoring_requests (status, submitted_at)
  where status = 'pending_review';

create index tutoring_requests_mentor_feed_idx
  on public.tutoring_requests (country_code, city, deadline)
  where status = 'open_for_quotes';

create index tutoring_requests_student_idx
  on public.tutoring_requests (student_id, created_at desc);

create table public.tutoring_request_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.tutoring_requests(id) on delete cascade,
  request_version integer not null check (request_version > 0),
  decision public.review_decision not null,
  reason text,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  unique (request_id, request_version),
  check (decision = 'approved' or char_length(trim(coalesce(reason, ''))) >= 5)
);

create table public.tutoring_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.tutoring_requests(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete restrict,
  revision integer not null check (revision > 0),
  supersedes_id uuid references public.tutoring_quotes(id) on delete set null,
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  billing_mode text not null check (billing_mode in ('one_time', 'hourly')),
  note text not null default '' check (char_length(note) <= 500),
  status public.tutoring_quote_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (request_id, mentor_id, revision)
);

create unique index tutoring_one_live_quote_per_mentor_idx
  on public.tutoring_quotes (request_id, mentor_id)
  where status in ('active', 'selected', 'accepted');

create index tutoring_quotes_request_idx on public.tutoring_quotes (request_id, created_at desc);

create table public.tutoring_quote_selections (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.tutoring_requests(id) on delete cascade,
  quote_id uuid not null references public.tutoring_quotes(id) on delete restrict,
  selected_by uuid not null references public.profiles(id) on delete restrict,
  status public.tutoring_selection_status not null default 'pending_admin',
  reviewed_by uuid references public.profiles(id) on delete restrict,
  review_reason text,
  selected_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (quote_id)
);

create unique index tutoring_one_live_selection_per_request_idx
  on public.tutoring_quote_selections (request_id)
  where status in ('pending_admin', 'approved');

create table public.tutoring_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.tutoring_requests(id) on delete restrict,
  selection_id uuid not null unique references public.tutoring_quote_selections(id) on delete restrict,
  quote_id uuid not null unique references public.tutoring_quotes(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  mentor_id uuid not null references public.profiles(id) on delete restrict,
  subject_snapshot text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  billing_mode text not null check (billing_mode in ('one_time', 'hourly')),
  country_code text not null references public.country_currency_rules(country_code),
  city text not null,
  status public.tutoring_order_status not null default 'awaiting_start',
  version integer not null default 1 check (version > 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (country_code, currency_code)
    references public.country_currency_rules(country_code, currency_code),
  check (student_id <> mentor_id)
);

create index tutoring_orders_student_idx on public.tutoring_orders (student_id, created_at desc);
create index tutoring_orders_mentor_idx on public.tutoring_orders (mentor_id, created_at desc);

create table public.tutoring_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.tutoring_orders(id) on delete cascade,
  from_status public.tutoring_order_status,
  to_status public.tutoring_order_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tutoring_order_events_order_idx on public.tutoring_order_events (order_id, created_at);

create table public.tutoring_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.tutoring_requests(id) on delete cascade,
  order_id uuid references public.tutoring_orders(id) on delete cascade,
  file_id uuid not null unique references public.file_assets(id) on delete restrict,
  purpose public.tutoring_file_purpose not null,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  review_status public.file_review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete restrict,
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (purpose in ('request_brief', 'request_supplement') and order_id is null)
    or (purpose = 'mentor_delivery' and order_id is not null)
  )
);

create index tutoring_files_review_queue_idx
  on public.tutoring_files (review_status, created_at)
  where review_status = 'pending';

create trigger tutoring_requests_set_updated_at
  before update on public.tutoring_requests
  for each row execute function public.set_updated_at();

create trigger tutoring_orders_set_updated_at
  before update on public.tutoring_orders
  for each row execute function public.set_updated_at();

create or replace function public.create_tutoring_request(
  request_address_id uuid,
  request_subject text,
  request_major_category text,
  request_major text,
  request_type text,
  request_mentor_summary text,
  request_brief_private text,
  request_deadline timestamptz,
  request_file_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_address public.addresses%rowtype;
  request_id uuid;
  attached_file_id uuid;
  file_position integer := 0;
begin
  if not public.is_scope_allowed('tutoring') then raise exception 'tutoring_access_restricted'; end if;
  select * into selected_address
  from public.addresses
  where id = request_address_id and user_id = auth.uid();
  if selected_address.id is null then raise exception 'address_not_found'; end if;
  if char_length(trim(coalesce(request_subject, ''))) not between 1 and 120 then raise exception 'invalid_subject'; end if;
  if char_length(trim(coalesce(request_major_category, ''))) not between 1 and 120 then raise exception 'invalid_major_category'; end if;
  if char_length(trim(coalesce(request_major, ''))) not between 1 and 120 then raise exception 'invalid_major'; end if;
  if request_type not in ('essay_structure', 'assignment_support', 'language_polish', 'course_tutoring') then raise exception 'invalid_request_type'; end if;
  if char_length(trim(coalesce(request_mentor_summary, ''))) not between 10 and 500 then raise exception 'invalid_mentor_summary'; end if;
  if char_length(trim(coalesce(request_brief_private, ''))) not between 10 and 5000 then raise exception 'invalid_private_brief'; end if;
  if request_deadline <= now() then raise exception 'invalid_deadline'; end if;
  if coalesce(cardinality(request_file_ids), 0) > 5 then raise exception 'too_many_files'; end if;
  if exists (
    select 1
    from unnest(coalesce(request_file_ids, '{}')) requested(file_id)
    left join public.file_assets f on f.id = requested.file_id
    where f.id is null
       or f.owner_id <> auth.uid()
       or f.category <> 'tutoring_request'
       or f.scan_status = 'blocked'
  ) then raise exception 'invalid_request_file'; end if;

  insert into public.tutoring_requests (
    student_id,
    address_id,
    subject,
    major_category,
    major,
    request_type,
    mentor_summary,
    brief_private,
    country_code,
    city,
    currency_code,
    deadline
  ) values (
    auth.uid(),
    selected_address.id,
    trim(request_subject),
    trim(request_major_category),
    trim(request_major),
    request_type,
    trim(request_mentor_summary),
    trim(request_brief_private),
    selected_address.country_code,
    selected_address.city,
    selected_address.currency_code,
    request_deadline
  ) returning id into request_id;

  foreach attached_file_id in array coalesce(request_file_ids, '{}') loop
    insert into public.tutoring_files (
      request_id, file_id, purpose, submitted_by
    ) values (
      request_id,
      attached_file_id,
      case when file_position = 0 then 'request_brief' else 'request_supplement' end,
      auth.uid()
    );
    file_position := file_position + 1;
  end loop;

  perform public.write_audit_event(
    'tutoring_request.submitted', 'tutoring_request', request_id::text, null,
    jsonb_build_object(
      'student_id', auth.uid(),
      'country_code', selected_address.country_code,
      'city', selected_address.city,
      'currency_code', selected_address.currency_code
    )
  );
  return request_id;
end;
$$;

create or replace function public.review_tutoring_request(
  target_request_id uuid,
  expected_version integer,
  review_decision public.review_decision,
  review_reason text default null
)
returns public.tutoring_request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.tutoring_requests%rowtype;
  next_status public.tutoring_request_status;
begin
  if not public.is_admin() then raise exception 'insufficient_role'; end if;
  select * into request_row from public.tutoring_requests where id = target_request_id for update;
  if request_row.id is null then raise exception 'request_not_found'; end if;
  if request_row.status <> 'pending_review' then raise exception 'request_not_pending'; end if;
  if request_row.version <> expected_version then raise exception 'stale_version'; end if;
  if review_decision = 'rejected' and char_length(trim(coalesce(review_reason, ''))) < 5 then raise exception 'reason_too_short'; end if;
  if review_decision = 'approved' and exists (
    select 1
    from public.tutoring_files tf
    join public.file_assets f on f.id = tf.file_id
    where tf.request_id = request_row.id
      and f.scan_status <> 'passed'
  ) then
    raise exception 'request_file_scan_not_passed';
  end if;

  next_status := case when review_decision = 'approved' then 'open_for_quotes' else 'rejected' end;
  insert into public.tutoring_request_reviews (
    request_id, request_version, decision, reason, reviewer_id
  ) values (
    request_row.id, request_row.version, review_decision,
    nullif(trim(coalesce(review_reason, '')), ''), auth.uid()
  );
  update public.tutoring_requests
     set status = next_status,
         version = version + 1,
         reviewed_at = now()
   where id = request_row.id;

  perform public.write_audit_event(
    'tutoring_request.reviewed', 'tutoring_request', request_row.id::text,
    to_jsonb(request_row), jsonb_build_object('status', next_status, 'reason', review_reason)
  );
  perform public.enqueue_notification(
    request_row.student_id,
    'tutoring_request_reviewed',
    'tutoring-request-reviewed-' || request_row.id::text || '-' || request_row.version::text,
    case when next_status = 'open_for_quotes' then '辅导需求已开放报价' else '辅导需求未通过审核' end,
    coalesce(review_reason, ''),
    jsonb_build_object('request_id', request_row.id, 'status', next_status)
  );
  return next_status;
end;
$$;

create or replace function public.get_mentor_open_requests()
returns table (
  id uuid,
  subject text,
  major_category text,
  major text,
  request_type text,
  mentor_summary text,
  country_code text,
  city text,
  currency_code text,
  deadline timestamptz,
  attachment_types text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_active_mentor() or not public.is_scope_allowed('tutoring') then
    raise exception 'mentor_access_required';
  end if;

  return query
  select
    r.id,
    r.subject,
    r.major_category,
    r.major,
    r.request_type,
    r.mentor_summary,
    r.country_code,
    r.city,
    r.currency_code,
    r.deadline,
    coalesce(array_agg(distinct f.mime_type) filter (where f.id is not null and f.scan_status = 'passed'), '{}')
  from public.tutoring_requests r
  left join public.tutoring_files tf on tf.request_id = r.id
  left join public.file_assets f on f.id = tf.file_id
  where r.status = 'open_for_quotes'
    and r.deadline > now()
    and r.student_id <> auth.uid()
  group by r.id;
end;
$$;

create or replace function public.submit_tutoring_quote(
  target_request_id uuid,
  quote_amount_minor bigint,
  quote_billing_mode text,
  quote_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.tutoring_requests%rowtype;
  previous_quote_id uuid;
  next_revision integer;
  quote_id uuid;
begin
  if not public.is_active_mentor() or not public.is_scope_allowed('tutoring') then raise exception 'mentor_access_required'; end if;
  if quote_amount_minor <= 0 then raise exception 'invalid_quote_amount'; end if;
  if quote_billing_mode not in ('one_time', 'hourly') then raise exception 'invalid_billing_mode'; end if;
  if char_length(coalesce(quote_note, '')) > 500 then raise exception 'quote_note_too_long'; end if;

  select * into request_row from public.tutoring_requests where id = target_request_id for update;
  if request_row.id is null or request_row.status <> 'open_for_quotes' or request_row.deadline <= now() then
    raise exception 'request_not_open';
  end if;
  if request_row.student_id = auth.uid() then raise exception 'cannot_quote_own_request'; end if;

  select id into previous_quote_id
  from public.tutoring_quotes
  where request_id = request_row.id
    and mentor_id = auth.uid()
    and status = 'active'
  for update;

  if exists (
    select 1 from public.tutoring_quotes
    where request_id = request_row.id
      and mentor_id = auth.uid()
      and status in ('selected', 'accepted')
  ) then raise exception 'selected_quote_cannot_be_replaced'; end if;

  select coalesce(max(revision), 0) + 1 into next_revision
  from public.tutoring_quotes
  where request_id = request_row.id and mentor_id = auth.uid();

  if previous_quote_id is not null then
    update public.tutoring_quotes set status = 'withdrawn' where id = previous_quote_id;
  end if;

  insert into public.tutoring_quotes (
    request_id,
    mentor_id,
    revision,
    supersedes_id,
    amount_minor,
    currency_code,
    billing_mode,
    note
  ) values (
    request_row.id,
    auth.uid(),
    next_revision,
    previous_quote_id,
    quote_amount_minor,
    request_row.currency_code,
    quote_billing_mode,
    trim(coalesce(quote_note, ''))
  ) returning id into quote_id;

  perform public.enqueue_notification(
    request_row.student_id,
    'tutoring_quote_received',
    'tutoring-quote-' || quote_id::text,
    '收到新的辅导报价',
    request_row.subject,
    jsonb_build_object('request_id', request_row.id, 'quote_id', quote_id)
  );
  return quote_id;
end;
$$;

create or replace function public.select_tutoring_quote(target_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_row public.tutoring_quotes%rowtype;
  request_row public.tutoring_requests%rowtype;
  target_request_id uuid;
  selection_id uuid;
begin
  if not public.is_scope_allowed('tutoring') then raise exception 'tutoring_access_restricted'; end if;
  if not public.is_identity_verified() then raise exception 'identity_verification_required'; end if;

  select request_id into target_request_id
  from public.tutoring_quotes
  where id = target_quote_id;
  if target_request_id is null then raise exception 'quote_not_available'; end if;
  select * into request_row from public.tutoring_requests where id = target_request_id for update;
  if request_row.id is null or request_row.student_id <> auth.uid() then raise exception 'request_not_owned'; end if;
  if request_row.status <> 'open_for_quotes' then raise exception 'request_not_open'; end if;
  select * into quote_row from public.tutoring_quotes where id = target_quote_id for update;
  if quote_row.id is null or quote_row.status <> 'active' then raise exception 'quote_not_available'; end if;
  if quote_row.currency_code <> request_row.currency_code then raise exception 'quote_currency_mismatch'; end if;
  if not public.is_active_mentor(quote_row.mentor_id) then raise exception 'mentor_not_active'; end if;

  update public.tutoring_quotes set status = 'selected' where id = quote_row.id;
  update public.tutoring_quotes
     set status = 'expired'
   where request_id = request_row.id
     and id <> quote_row.id
     and status = 'active';
  update public.tutoring_requests
     set status = 'quote_selected', version = version + 1
   where id = request_row.id;

  insert into public.tutoring_quote_selections (
    request_id, quote_id, selected_by
  ) values (
    request_row.id, quote_row.id, auth.uid()
  ) returning id into selection_id;

  perform public.write_audit_event(
    'tutoring_quote.selected', 'tutoring_selection', selection_id::text, null,
    jsonb_build_object('request_id', request_row.id, 'quote_id', quote_row.id)
  );
  return selection_id;
end;
$$;

create or replace function public.submit_tutoring_delivery(
  target_order_id uuid,
  delivery_file_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.tutoring_orders%rowtype;
  tutoring_file_id uuid;
begin
  if not public.is_scope_allowed('tutoring') then raise exception 'tutoring_access_restricted'; end if;
  select * into order_row from public.tutoring_orders where id = target_order_id for update;
  if order_row.id is null or order_row.mentor_id <> auth.uid() then raise exception 'order_not_owned_by_mentor'; end if;
  if order_row.status <> 'in_progress' then raise exception 'order_not_in_progress'; end if;
  if not exists (
    select 1 from public.file_assets
    where id = delivery_file_id
      and owner_id = auth.uid()
      and category = 'tutoring_delivery'
      and scan_status <> 'blocked'
  ) then raise exception 'delivery_file_not_found'; end if;

  insert into public.tutoring_files (
    request_id, order_id, file_id, purpose, submitted_by
  ) values (
    order_row.request_id, order_row.id, delivery_file_id, 'mentor_delivery', auth.uid()
  ) returning id into tutoring_file_id;
  update public.tutoring_orders set status = 'file_review', version = version + 1 where id = order_row.id;
  update public.tutoring_requests set status = 'file_review', version = version + 1 where id = order_row.request_id;
  insert into public.tutoring_order_events (order_id, from_status, to_status, actor_id, reason)
  values (order_row.id, order_row.status, 'file_review', auth.uid(), 'delivery_submitted');
  return tutoring_file_id;
end;
$$;

create or replace function public.review_tutoring_file(
  target_tutoring_file_id uuid,
  review_decision public.review_decision,
  review_reason text default null
)
returns public.file_review_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_row public.tutoring_files%rowtype;
  asset_row public.file_assets%rowtype;
  order_row public.tutoring_orders%rowtype;
  next_review_status public.file_review_status;
begin
  if not public.is_admin() then raise exception 'insufficient_role'; end if;
  select * into file_row from public.tutoring_files where id = target_tutoring_file_id for update;
  if file_row.id is null then raise exception 'file_not_found'; end if;
  if file_row.review_status <> 'pending' then raise exception 'file_already_reviewed'; end if;
  select * into asset_row from public.file_assets where id = file_row.file_id;
  if review_decision = 'approved' and asset_row.scan_status <> 'passed' then raise exception 'file_scan_not_passed'; end if;
  if review_decision = 'rejected' and char_length(trim(coalesce(review_reason, ''))) < 5 then raise exception 'reason_too_short'; end if;

  next_review_status := case when review_decision = 'approved' then 'approved' else 'rejected' end;
  update public.tutoring_files
     set review_status = next_review_status,
         reviewed_by = auth.uid(),
         review_reason = nullif(trim(coalesce(review_reason, '')), ''),
         reviewed_at = now()
   where id = file_row.id;

  if file_row.order_id is not null and file_row.purpose = 'mentor_delivery' then
    select * into order_row from public.tutoring_orders where id = file_row.order_id for update;
    update public.tutoring_orders
       set status = case when next_review_status = 'approved' then 'awaiting_student' else 'in_progress' end,
           version = version + 1
     where id = order_row.id;
    insert into public.tutoring_order_events (order_id, from_status, to_status, actor_id, reason)
    values (
      order_row.id,
      order_row.status,
      case when next_review_status = 'approved' then 'awaiting_student' else 'in_progress' end,
      auth.uid(),
      review_reason
    );
    perform public.enqueue_notification(
      case when next_review_status = 'approved' then order_row.student_id else order_row.mentor_id end,
      'tutoring_file_reviewed',
      'tutoring-file-reviewed-' || file_row.id::text,
      case when next_review_status = 'approved' then '辅导文件已通过审核' else '辅导文件需要重新上传' end,
      coalesce(review_reason, ''),
      jsonb_build_object('order_id', order_row.id, 'file_id', file_row.id, 'status', next_review_status)
    );
  end if;

  perform public.write_audit_event(
    'tutoring_file.reviewed', 'tutoring_file', file_row.id::text,
    to_jsonb(file_row), jsonb_build_object('status', next_review_status, 'reason', review_reason)
  );
  return next_review_status;
end;
$$;

create or replace function public.transition_tutoring_order(
  target_order_id uuid,
  transition_action text,
  transition_reason text default null
)
returns public.tutoring_order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.tutoring_orders%rowtype;
  next_status public.tutoring_order_status;
begin
  select * into order_row from public.tutoring_orders where id = target_order_id for update;
  if order_row.id is null then raise exception 'order_not_found'; end if;
  if not public.is_scope_allowed('tutoring') and not public.is_admin() then raise exception 'tutoring_access_restricted'; end if;

  if transition_action = 'start' and order_row.status = 'awaiting_start' and order_row.mentor_id = auth.uid() then
    next_status := 'in_progress';
  elsif transition_action = 'complete' and order_row.status = 'awaiting_student' and order_row.student_id = auth.uid() then
    next_status := 'completed';
  elsif transition_action = 'dispute' and order_row.status in ('awaiting_start', 'in_progress', 'file_review', 'awaiting_student') and auth.uid() in (order_row.student_id, order_row.mentor_id) then
    next_status := 'disputed';
  elsif transition_action = 'cancel' and public.is_admin() and order_row.status not in ('completed', 'cancelled') then
    next_status := 'cancelled';
  else
    raise exception 'invalid_order_transition';
  end if;

  if transition_action in ('dispute', 'cancel') and char_length(trim(coalesce(transition_reason, ''))) < 5 then
    raise exception 'reason_too_short';
  end if;
  update public.tutoring_orders
     set status = next_status,
         version = version + 1,
         started_at = case when transition_action = 'start' then now() else started_at end,
         completed_at = case when transition_action = 'complete' then now() else completed_at end
   where id = order_row.id;
  update public.tutoring_requests
     set status = case
       when next_status = 'in_progress' then 'in_progress'
       when next_status = 'completed' then 'completed'
       when next_status = 'disputed' then 'disputed'
       when next_status = 'cancelled' then 'cancelled'
       else status
     end,
         version = case
          when next_status in ('in_progress', 'completed', 'disputed', 'cancelled') then version + 1
          else version
        end
   where id = order_row.request_id;
  insert into public.tutoring_order_events (order_id, from_status, to_status, actor_id, reason)
  values (order_row.id, order_row.status, next_status, auth.uid(), transition_reason);
  return next_status;
end;
$$;

alter table public.tutoring_requests enable row level security;
alter table public.tutoring_request_reviews enable row level security;
alter table public.tutoring_quotes enable row level security;
alter table public.tutoring_quote_selections enable row level security;
alter table public.tutoring_orders enable row level security;
alter table public.tutoring_order_events enable row level security;
alter table public.tutoring_files enable row level security;

create policy tutoring_requests_read_owner_or_admin
  on public.tutoring_requests for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy tutoring_request_reviews_read
  on public.tutoring_request_reviews for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tutoring_requests r
      where r.id = request_id and r.student_id = auth.uid()
    )
  );

create policy tutoring_quotes_read
  on public.tutoring_quotes for select to authenticated
  using (
    mentor_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.tutoring_requests r
      where r.id = request_id and r.student_id = auth.uid()
    )
  );

create policy tutoring_selections_read
  on public.tutoring_quote_selections for select to authenticated
  using (
    selected_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.tutoring_quotes q
      where q.id = quote_id and q.mentor_id = auth.uid()
    )
  );

create policy tutoring_orders_read
  on public.tutoring_orders for select to authenticated
  using (student_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

create policy tutoring_order_events_read
  on public.tutoring_order_events for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tutoring_orders o
      where o.id = order_id and auth.uid() in (o.student_id, o.mentor_id)
    )
  );

create policy tutoring_files_read
  on public.tutoring_files for select to authenticated
  using (
    submitted_by = auth.uid()
    or public.is_admin()
    or (
      review_status = 'approved'
      and order_id is not null
      and exists (
        select 1 from public.tutoring_orders o
        where o.id = order_id and auth.uid() in (o.student_id, o.mentor_id)
      )
    )
  );

create policy file_assets_read_approved_tutoring_participant
  on public.file_assets for select to authenticated
  using (
    exists (
      select 1
      from public.tutoring_files tf
      join public.tutoring_orders o on o.id = tf.order_id
      where tf.file_id = file_assets.id
        and tf.review_status = 'approved'
        and auth.uid() in (o.student_id, o.mentor_id)
    )
  );

revoke all on public.tutoring_requests from anon, authenticated;
revoke all on public.tutoring_request_reviews from anon, authenticated;
revoke all on public.tutoring_quotes from anon, authenticated;
revoke all on public.tutoring_quote_selections from anon, authenticated;
revoke all on public.tutoring_orders from anon, authenticated;
revoke all on public.tutoring_order_events from anon, authenticated;
revoke all on public.tutoring_files from anon, authenticated;

grant select on public.tutoring_requests, public.tutoring_request_reviews, public.tutoring_quotes, public.tutoring_quote_selections, public.tutoring_orders, public.tutoring_order_events, public.tutoring_files to authenticated;

revoke all on function public.create_tutoring_request(uuid,text,text,text,text,text,text,timestamptz,uuid[]) from public, anon;
revoke all on function public.review_tutoring_request(uuid,integer,public.review_decision,text) from public, anon;
revoke all on function public.get_mentor_open_requests() from public, anon;
revoke all on function public.submit_tutoring_quote(uuid,bigint,text,text) from public, anon;
revoke all on function public.select_tutoring_quote(uuid) from public, anon;
revoke all on function public.submit_tutoring_delivery(uuid,uuid) from public, anon;
revoke all on function public.review_tutoring_file(uuid,public.review_decision,text) from public, anon;
revoke all on function public.transition_tutoring_order(uuid,text,text) from public, anon;

grant execute on function public.create_tutoring_request(uuid,text,text,text,text,text,text,timestamptz,uuid[]) to authenticated;
grant execute on function public.review_tutoring_request(uuid,integer,public.review_decision,text) to authenticated;
grant execute on function public.get_mentor_open_requests() to authenticated;
grant execute on function public.submit_tutoring_quote(uuid,bigint,text,text) to authenticated;
grant execute on function public.select_tutoring_quote(uuid) to authenticated;
grant execute on function public.submit_tutoring_delivery(uuid,uuid) to authenticated;
grant execute on function public.review_tutoring_file(uuid,public.review_decision,text) to authenticated;
grant execute on function public.transition_tutoring_order(uuid,text,text) to authenticated;

commit;
