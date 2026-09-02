-- CampusLoop v2 conversations, payment facts, reports, storage, and realtime.

begin;

create type public.conversation_kind as enum ('market_order', 'tutoring_order');
create type public.conversation_status as enum ('open', 'closed', 'frozen');
create type public.message_kind as enum ('text', 'file', 'system');
create type public.payment_status as enum ('pending', 'processing', 'paid', 'failed', 'expired', 'refunded');
create type public.payment_purpose as enum ('buyer_fee', 'seller_fee', 'tutoring_payment', 'refund');
create type public.report_status as enum ('pending', 'investigating', 'resolved', 'dismissed');
create type public.report_priority as enum ('low', 'medium', 'high');
create type public.report_target_type as enum ('user', 'market_listing', 'market_order', 'tutoring_order', 'conversation', 'message', 'file');
create type public.report_action_type as enum ('confirm', 'dismiss', 'escalate');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  market_order_id uuid references public.market_orders(id) on delete cascade,
  tutoring_order_id uuid references public.tutoring_orders(id) on delete cascade,
  status public.conversation_status not null default 'open',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'market_order' and market_order_id is not null and tutoring_order_id is null)
    or (kind = 'tutoring_order' and tutoring_order_id is not null and market_order_id is null)
  )
);

create unique index conversations_one_market_order_idx
  on public.conversations (market_order_id)
  where market_order_id is not null;

create unique index conversations_one_tutoring_order_idx
  on public.conversations (tutoring_order_id)
  where tutoring_order_id is not null;

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null check (member_role in ('buyer', 'seller', 'student', 'mentor')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id, joined_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  client_message_id uuid not null,
  kind public.message_kind not null default 'text',
  body text,
  file_id uuid references public.file_assets(id) on delete restrict,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  unique (conversation_id, sender_id, client_message_id),
  check (
    (kind = 'text' and char_length(trim(coalesce(body, ''))) between 1 and 2000 and file_id is null)
    or (kind = 'file' and file_id is not null and coalesce(body, '') = '')
    or (kind = 'system' and char_length(trim(coalesce(body, ''))) between 1 and 2000 and file_id is null)
  )
);

create index messages_conversation_idx on public.messages (conversation_id, created_at, id);

create table public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id),
  check (read_at is null or delivered_at is not null),
  check (read_at is null or read_at >= delivered_at)
);

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  market_order_id uuid references public.market_orders(id) on delete cascade,
  tutoring_order_id uuid references public.tutoring_orders(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete restrict,
  purpose public.payment_purpose not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  provider text,
  provider_reference text,
  status public.payment_status not null default 'pending',
  idempotency_key text not null,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (case when market_order_id is not null then 1 else 0 end)
    + (case when tutoring_order_id is not null then 1 else 0 end) = 1
  ),
  unique (payer_id, idempotency_key),
  unique (provider, provider_reference)
);

create index payment_intents_market_order_idx on public.payment_intents (market_order_id, purpose);
create index payment_intents_tutoring_order_idx on public.payment_intents (tutoring_order_id, purpose);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payment_intent_id uuid references public.payment_intents(id) on delete set null,
  signature_valid boolean not null,
  payload jsonb not null,
  processing_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  payment_intent_id uuid not null references public.payment_intents(id) on delete restrict,
  entry_type text not null check (entry_type in ('charge', 'fee', 'refund', 'adjustment')),
  amount_minor bigint not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- A provider reference is the idempotency boundary for the append-only ledger.
create unique index ledger_entries_payment_reference_idx
  on public.ledger_entries (payment_intent_id, entry_type, external_reference)
  where external_reference is not null;

create or replace function public.create_tutoring_payment_intent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.payment_intents (
    tutoring_order_id,
    payer_id,
    purpose,
    amount_minor,
    currency_code,
    idempotency_key
  ) values (
    new.id,
    new.student_id,
    'tutoring_payment',
    new.amount_minor,
    new.currency_code,
    'tutoring:' || new.id::text || ':student-payment'
  )
  on conflict (payer_id, idempotency_key) do nothing;
  return new;
end;
$$;

create trigger tutoring_orders_create_payment_intent
  after insert on public.tutoring_orders
  for each row execute function public.create_tutoring_payment_intent();

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  target_type public.report_target_type not null,
  target_id uuid not null,
  category text not null check (char_length(category) between 3 and 80),
  summary text not null check (char_length(trim(summary)) between 10 and 2000),
  priority public.report_priority not null default 'medium',
  status public.report_status not null default 'pending',
  assigned_to uuid references public.profiles(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index reports_review_queue_idx on public.reports (status, priority, created_at)
  where status in ('pending', 'investigating');

create index reports_reporter_idx on public.reports (reporter_id, created_at desc);

create table public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  file_id uuid references public.file_assets(id) on delete restrict,
  evidence_type text not null check (evidence_type in ('file', 'message_snapshot', 'page_snapshot', 'system_snapshot')),
  snapshot jsonb,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((evidence_type = 'file' and file_id is not null) or evidence_type <> 'file')
);

create table public.report_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  report_version integer not null check (report_version > 0),
  action public.report_action_type not null,
  reason text not null check (char_length(trim(reason)) between 5 and 1000),
  outcome text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (report_id, report_version)
);

create table public.safety_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  action_type text not null check (action_type in ('warning', 'content_suspended', 'messaging_restricted', 'order_frozen', 'settlement_paused')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create trigger payment_intents_set_updated_at
  before update on public.payment_intents
  for each row execute function public.set_updated_at();

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create or replace function public.is_conversation_member(
  target_conversation_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id is not null and exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and user_id = target_user_id
      and left_at is null
  );
$$;

create or replace function public.create_order_conversation(
  target_kind public.conversation_kind,
  target_market_order_id uuid,
  target_tutoring_order_id uuid,
  first_user_id uuid,
  first_role text,
  second_user_id uuid,
  second_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_id uuid;
begin
  insert into public.conversations (
    kind, market_order_id, tutoring_order_id, created_by
  ) values (
    target_kind, target_market_order_id, target_tutoring_order_id, auth.uid()
  )
  on conflict do nothing;

  select id into conversation_id
  from public.conversations
  where (target_kind = 'market_order' and market_order_id = target_market_order_id)
     or (target_kind = 'tutoring_order' and tutoring_order_id = target_tutoring_order_id);

  insert into public.conversation_members (conversation_id, user_id, member_role)
  values
    (conversation_id, first_user_id, first_role),
    (conversation_id, second_user_id, second_role)
  on conflict (conversation_id, user_id) do update
    set left_at = null;
  return conversation_id;
end;
$$;

create or replace function public.review_tutoring_match(
  target_selection_id uuid,
  expected_request_version integer,
  review_decision public.review_decision,
  review_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selection_row public.tutoring_quote_selections%rowtype;
  quote_row public.tutoring_quotes%rowtype;
  request_row public.tutoring_requests%rowtype;
  target_request_id uuid;
  target_quote_id uuid;
  order_id uuid;
  conversation_id uuid;
begin
  if not public.is_admin() then raise exception 'insufficient_role'; end if;
  select request_id, quote_id into target_request_id, target_quote_id
  from public.tutoring_quote_selections
  where id = target_selection_id;
  if target_quote_id is null then raise exception 'selection_not_found'; end if;
  select * into request_row from public.tutoring_requests where id = target_request_id for update;
  if request_row.id is null then raise exception 'request_not_found'; end if;
  select * into selection_row from public.tutoring_quote_selections where id = target_selection_id for update;
  if selection_row.status <> 'pending_admin' then raise exception 'selection_not_pending'; end if;
  select * into quote_row from public.tutoring_quotes where id = target_quote_id for update;
  if request_row.version <> expected_request_version then raise exception 'stale_version'; end if;
  if request_row.status <> 'quote_selected' or quote_row.status <> 'selected' then raise exception 'selection_state_invalid'; end if;
  if quote_row.currency_code <> request_row.currency_code then raise exception 'quote_currency_mismatch'; end if;
  if review_decision = 'rejected' and char_length(trim(coalesce(review_reason, ''))) < 5 then raise exception 'reason_too_short'; end if;

  if review_decision = 'rejected' then
    update public.tutoring_quote_selections
       set status = 'rejected', reviewed_by = auth.uid(), review_reason = trim(review_reason), reviewed_at = now()
     where id = selection_row.id;
    update public.tutoring_quotes set status = 'rejected' where id = quote_row.id;
    update public.tutoring_requests set status = 'open_for_quotes', version = version + 1 where id = request_row.id;
    perform public.write_audit_event(
      'tutoring_match.rejected', 'tutoring_selection', selection_row.id::text,
      to_jsonb(selection_row), jsonb_build_object('reason', review_reason)
    );
    perform public.enqueue_notification(
      request_row.student_id,
      'tutoring_match_rejected',
      'tutoring-match-rejected-' || selection_row.id::text,
      '辅导匹配未通过',
      trim(review_reason),
      jsonb_build_object('request_id', request_row.id, 'selection_id', selection_row.id)
    );
    return null;
  end if;

  if not public.is_active_mentor(quote_row.mentor_id) then raise exception 'mentor_not_active'; end if;
  update public.tutoring_quote_selections
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = selection_row.id;
  update public.tutoring_quotes set status = 'accepted' where id = quote_row.id;
  update public.tutoring_requests set status = 'matched', version = version + 1 where id = request_row.id;

  insert into public.tutoring_orders (
    request_id,
    selection_id,
    quote_id,
    student_id,
    mentor_id,
    subject_snapshot,
    amount_minor,
    currency_code,
    billing_mode,
    country_code,
    city
  ) values (
    request_row.id,
    selection_row.id,
    quote_row.id,
    request_row.student_id,
    quote_row.mentor_id,
    request_row.subject,
    quote_row.amount_minor,
    quote_row.currency_code,
    quote_row.billing_mode,
    request_row.country_code,
    request_row.city
  ) returning id into order_id;

  insert into public.tutoring_order_events (order_id, to_status, actor_id, reason)
  values (order_id, 'awaiting_start', auth.uid(), 'match_approved');
  conversation_id := public.create_order_conversation(
    'tutoring_order', null, order_id,
    request_row.student_id, 'student', quote_row.mentor_id, 'mentor'
  );
  perform public.write_audit_event(
    'tutoring_match.approved', 'tutoring_order', order_id::text,
    null, jsonb_build_object('request_id', request_row.id, 'quote_id', quote_row.id, 'conversation_id', conversation_id)
  );
  perform public.enqueue_notification(
    request_row.student_id,
    'tutoring_match_approved',
    'tutoring-match-approved-student-' || selection_row.id::text,
    '辅导匹配已确认',
    request_row.subject,
    jsonb_build_object('order_id', order_id, 'conversation_id', conversation_id)
  );
  perform public.enqueue_notification(
    quote_row.mentor_id,
    'tutoring_match_approved',
    'tutoring-match-approved-mentor-' || selection_row.id::text,
    '你的辅导报价已获确认',
    request_row.subject,
    jsonb_build_object('order_id', order_id, 'conversation_id', conversation_id)
  );
  return order_id;
end;
$$;

create or replace function public.create_market_fee_intents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'awaiting_fees' and old.status is distinct from new.status then
    insert into public.payment_intents (
      market_order_id, payer_id, purpose, amount_minor, currency_code, idempotency_key
    ) values
      (new.id, new.buyer_id, 'buyer_fee', new.buyer_fee_minor, new.currency_code, 'market:' || new.id::text || ':buyer-fee'),
      (new.id, new.seller_id, 'seller_fee', new.seller_fee_minor, new.currency_code, 'market:' || new.id::text || ':seller-fee')
    on conflict (payer_id, idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger market_orders_create_fee_intents
  after update of status on public.market_orders
  for each row execute function public.create_market_fee_intents();

create or replace function public.apply_payment_webhook(
  p_payment_provider text,
  p_provider_event_id text,
  p_target_payment_intent_id uuid,
  p_next_payment_status public.payment_status,
  p_provider_reference text,
  p_webhook_payload jsonb,
  p_signature_is_valid boolean
)
returns public.payment_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row public.payment_intents%rowtype;
  existing_webhook public.payment_webhook_events%rowtype;
  webhook_id uuid;
  moved_market_order_id uuid;
  existing_payment_status public.payment_status;
  moved_market_order_from public.market_order_status;
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'service_role_required';
  end if;

  if char_length(trim(coalesce(p_payment_provider, ''))) < 2
     or char_length(trim(coalesce(p_provider_event_id, ''))) < 2 then
    raise exception 'invalid_provider_event';
  end if;
  if p_next_payment_status in ('paid', 'refunded')
     and char_length(trim(coalesce(p_provider_reference, ''))) < 2 then
    raise exception 'provider_reference_required';
  end if;

  insert into public.payment_webhook_events (
    provider, provider_event_id, payment_intent_id, signature_valid, payload
  ) values (
    p_payment_provider, p_provider_event_id, p_target_payment_intent_id, p_signature_is_valid, p_webhook_payload
  )
  on conflict (provider, provider_event_id) do nothing;

  select * into existing_webhook
  from public.payment_webhook_events
  where payment_webhook_events.provider = p_payment_provider
    and payment_webhook_events.provider_event_id = p_provider_event_id
  for update;

  if existing_webhook.payment_intent_id is distinct from p_target_payment_intent_id then
    raise exception 'provider_event_conflict';
  end if;
  if existing_webhook.processed_at is not null then
    if not existing_webhook.signature_valid then raise exception 'invalid_signature'; end if;
    select status into existing_payment_status
    from public.payment_intents
    where id = existing_webhook.payment_intent_id;
    if existing_payment_status is null then raise exception 'payment_intent_not_found'; end if;
    return existing_payment_status;
  end if;
  webhook_id := existing_webhook.id;
  if not p_signature_is_valid then
    update public.payment_webhook_events
       set processing_error = 'invalid_signature', processed_at = now()
     where id = webhook_id;
    return 'failed'::public.payment_status;
  end if;
  update public.payment_webhook_events
     set signature_valid = p_signature_is_valid,
         payload = p_webhook_payload,
         processing_error = null,
         processed_at = null
   where id = webhook_id;

  select * into payment_row from public.payment_intents where id = p_target_payment_intent_id for update;
  if payment_row.id is null then raise exception 'payment_intent_not_found'; end if;
  if payment_row.status = 'refunded' then
    update public.payment_webhook_events set processed_at = now() where id = webhook_id;
    return payment_row.status;
  end if;
  if p_next_payment_status not in ('processing', 'paid', 'failed', 'expired', 'refunded') then raise exception 'invalid_payment_status'; end if;
  if p_next_payment_status = 'refunded' and payment_row.status <> 'paid' then
    raise exception 'payment_not_paid';
  end if;
  if payment_row.status = 'paid' and p_next_payment_status <> 'refunded' then
    update public.payment_webhook_events set processed_at = now() where id = webhook_id;
    return payment_row.status;
  end if;

  update public.payment_intents
     set provider = p_payment_provider,
         provider_reference = p_provider_reference,
         status = p_next_payment_status,
         paid_at = case when p_next_payment_status = 'paid' then now() else paid_at end
   where id = payment_row.id;

  if p_next_payment_status in ('paid', 'refunded') then
    insert into public.ledger_entries (
      payment_intent_id, entry_type, amount_minor, currency_code, external_reference
    ) values (
      payment_row.id,
      case
        when p_next_payment_status = 'refunded' then 'refund'
        when payment_row.purpose in ('buyer_fee', 'seller_fee') then 'fee'
        else 'charge'
      end,
      case when p_next_payment_status = 'refunded' then -payment_row.amount_minor else payment_row.amount_minor end,
      payment_row.currency_code,
      p_provider_reference
    ) on conflict (payment_intent_id, entry_type, external_reference) do nothing;
  end if;

  if payment_row.market_order_id is not null and not exists (
    select 1 from public.payment_intents
    where market_order_id = payment_row.market_order_id
      and purpose in ('buyer_fee', 'seller_fee')
      and status <> 'paid'
  ) and p_next_payment_status = 'paid' then
    update public.market_orders
       set status = 'awaiting_contact_consents', version = version + 1
     where id = payment_row.market_order_id and status = 'awaiting_fees'
     returning id into moved_market_order_id;
    if moved_market_order_id is not null then
      insert into public.market_order_events (order_id, from_status, to_status, reason)
      values (moved_market_order_id, 'awaiting_fees', 'awaiting_contact_consents', 'fees_paid');
    end if;
  end if;

  if p_next_payment_status = 'refunded' and payment_row.market_order_id is not null
     and not exists (
       select 1 from public.payment_intents
       where market_order_id = payment_row.market_order_id
         and purpose in ('buyer_fee', 'seller_fee')
         and status <> 'refunded'
     ) then
    select status into moved_market_order_from
    from public.market_orders
    where id = payment_row.market_order_id
    for update;
    update public.market_orders
       set status = 'refunded', version = version + 1
     where id = payment_row.market_order_id
       and status not in ('cancelled', 'refunded')
     returning id into moved_market_order_id;
    if moved_market_order_id is not null then
      insert into public.market_order_events (order_id, from_status, to_status, reason)
      values (moved_market_order_id, moved_market_order_from, 'refunded', 'payment_refunded');
    end if;
  end if;

  update public.payment_webhook_events set processed_at = now() where id = webhook_id;
  return p_next_payment_status;
end;
$$;

create or replace function public.consent_market_contact_exchange(target_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.market_orders%rowtype;
  consent_count integer;
  conversation_id uuid;
begin
  if not public.is_scope_allowed('market') or not public.is_scope_allowed('messaging') then
    raise exception 'account_restricted';
  end if;
  select * into order_row from public.market_orders where id = target_order_id for update;
  if order_row.id is null or auth.uid() not in (order_row.buyer_id, order_row.seller_id) then raise exception 'order_access_denied'; end if;
  if order_row.status not in ('awaiting_contact_consents', 'contact_revealed') then raise exception 'order_not_ready_for_contact_exchange'; end if;

  insert into public.market_contact_consents (order_id, user_id)
  values (order_row.id, auth.uid())
  on conflict (order_id, user_id) do update
    set consented_at = now(), revoked_at = null;

  select count(*) into consent_count
  from public.market_contact_consents
  where order_id = order_row.id
    and user_id in (order_row.buyer_id, order_row.seller_id)
    and revoked_at is null;

  if consent_count = 2 and order_row.status = 'awaiting_contact_consents' then
    update public.market_orders
       set status = 'contact_revealed', contact_revealed_at = now(), version = version + 1
     where id = order_row.id;
    insert into public.market_order_events (order_id, from_status, to_status, actor_id, reason)
    values (order_row.id, 'awaiting_contact_consents', 'contact_revealed', auth.uid(), 'both_parties_consented');
    conversation_id := public.create_order_conversation(
      'market_order', order_row.id, null,
      order_row.buyer_id, 'buyer', order_row.seller_id, 'seller'
    );
    perform public.enqueue_notification(
      order_row.buyer_id,
      'market_contact_revealed',
      'market-contact-buyer-' || order_row.id::text,
      '双方已同意交换联系方式',
      order_row.listing_title_snapshot,
      jsonb_build_object('order_id', order_row.id, 'conversation_id', conversation_id)
    );
    perform public.enqueue_notification(
      order_row.seller_id,
      'market_contact_revealed',
      'market-contact-seller-' || order_row.id::text,
      '双方已同意交换联系方式',
      order_row.listing_title_snapshot,
      jsonb_build_object('order_id', order_row.id, 'conversation_id', conversation_id)
    );
    return true;
  end if;
  return consent_count = 2;
end;
$$;

create or replace function public.get_market_order_counterparty_contact(target_order_id uuid)
returns table (display_name text, email text, phone text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  order_row public.market_orders%rowtype;
  counterparty_id uuid;
begin
  if not public.is_scope_allowed('market') or not public.is_scope_allowed('messaging') then
    raise exception 'account_restricted';
  end if;
  select * into order_row from public.market_orders where id = target_order_id;
  if order_row.id is null or auth.uid() not in (order_row.buyer_id, order_row.seller_id) then raise exception 'order_access_denied'; end if;
  if order_row.contact_revealed_at is null or order_row.status not in ('contact_revealed', 'handover_pending', 'completed') then
    raise exception 'contact_not_revealed';
  end if;
  counterparty_id := case when auth.uid() = order_row.buyer_id then order_row.seller_id else order_row.buyer_id end;
  return query
  select p.display_name, private_profile.email, private_profile.phone
  from public.profiles p
  join public.user_private_profiles private_profile on private_profile.user_id = p.id
  where p.id = counterparty_id;
end;
$$;

create or replace function public.create_message_receipts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.message_receipts (message_id, user_id, delivered_at, read_at)
  select
    new.id,
    member.user_id,
    case when member.user_id = new.sender_id then now() else null end,
    case when member.user_id = new.sender_id then now() else null end
  from public.conversation_members member
  where member.conversation_id = new.conversation_id and member.left_at is null;

  update public.conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create or replace function public.can_read_market_media(
  target_bucket_id text,
  target_object_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.file_assets f
    join public.market_listing_media media on media.file_id = f.id
    join public.market_listings listing on listing.id = media.listing_id
    where f.bucket_id = target_bucket_id
      and f.object_path = target_object_path
      and f.scan_status = 'passed'
      and (
        f.owner_id = auth.uid()
        or public.is_admin()
        or (listing.status = 'approved' and listing.available_quantity > 0)
      )
  );
$$;

create trigger messages_create_receipts
  after insert on public.messages
  for each row execute function public.create_message_receipts();

create or replace function public.acknowledge_message_delivery(target_message_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_id uuid;
  result_delivered_at timestamptz;
begin
  select m.conversation_id into conversation_id
  from public.messages m
  where m.id = target_message_id;
  if conversation_id is null or not public.is_conversation_member(conversation_id) then
    raise exception 'conversation_access_denied';
  end if;

  update public.message_receipts receipt
     set delivered_at = coalesce(receipt.delivered_at, now())
   where receipt.message_id = target_message_id
     and receipt.user_id = auth.uid()
  returning receipt.delivered_at into result_delivered_at;
  if result_delivered_at is null then
    raise exception 'message_receipt_not_found';
  end if;
  return result_delivered_at;
end;
$$;

create or replace function public.send_message(
  target_conversation_id uuid,
  client_id uuid,
  message_body text default null,
  attachment_file_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.conversations%rowtype;
  message_id uuid;
  message_kind public.message_kind;
begin
  if not public.is_scope_allowed('messaging') then raise exception 'messaging_restricted'; end if;
  if client_id is null then raise exception 'client_message_id_required'; end if;
  if not public.is_conversation_member(target_conversation_id) then raise exception 'conversation_access_denied'; end if;
  select * into conversation_row from public.conversations where id = target_conversation_id;
  if conversation_row.status <> 'open' then raise exception 'conversation_not_open'; end if;
  if (nullif(trim(coalesce(message_body, '')), '') is null) = (attachment_file_id is null) then
    raise exception 'provide_exactly_one_message_payload';
  end if;

  if attachment_file_id is not null then
    if not exists (
      select 1 from public.file_assets
      where id = attachment_file_id
        and owner_id = auth.uid()
        and category = 'message_attachment'
        and scan_status = 'passed'
    ) then raise exception 'attachment_not_available'; end if;
    message_kind := 'file';
  else
    if char_length(trim(message_body)) > 2000 then raise exception 'message_too_long'; end if;
    message_kind := 'text';
  end if;

  insert into public.messages (
    conversation_id, sender_id, client_message_id, kind, body, file_id
  ) values (
    target_conversation_id,
    auth.uid(),
    client_id,
    message_kind,
    case when message_kind = 'text' then trim(message_body) else null end,
    attachment_file_id
  )
  on conflict (conversation_id, sender_id, client_message_id) do update
    set client_message_id = excluded.client_message_id
  returning id into message_id;
  return message_id;
end;
$$;

create or replace function public.mark_conversation_read(
  target_conversation_id uuid,
  through_message_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  read_through timestamptz;
begin
  if not public.is_conversation_member(target_conversation_id) then raise exception 'conversation_access_denied'; end if;
  select created_at into read_through
  from public.messages
  where id = through_message_id and conversation_id = target_conversation_id;
  if read_through is null then raise exception 'message_not_found'; end if;

  update public.conversation_members
     set last_read_at = greatest(coalesce(last_read_at, '-infinity'::timestamptz), read_through)
   where conversation_id = target_conversation_id and user_id = auth.uid();
  update public.message_receipts receipt
     set read_at = greatest(coalesce(receipt.read_at, '-infinity'::timestamptz), now()),
         delivered_at = coalesce(receipt.delivered_at, now())
    from public.messages message
   where receipt.message_id = message.id
     and receipt.user_id = auth.uid()
     and message.conversation_id = target_conversation_id
     and message.created_at <= read_through;
  return read_through;
end;
$$;

create or replace function public.create_report(
  reported_target_type public.report_target_type,
  reported_target_id uuid,
  report_category text,
  report_summary text,
  evidence_file_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_id uuid;
  evidence_file_id uuid;
begin
  if not public.is_account_active() then raise exception 'account_restricted'; end if;
  if char_length(trim(coalesce(report_category, ''))) not between 3 and 80 then raise exception 'invalid_category'; end if;
  if char_length(trim(coalesce(report_summary, ''))) not between 10 and 2000 then raise exception 'invalid_summary'; end if;
  if coalesce(cardinality(evidence_file_ids), 0) > 10 then raise exception 'too_many_evidence_files'; end if;
  if reported_target_type = 'user' and not exists (
    select 1 from public.profiles where id = reported_target_id
  ) then raise exception 'report_target_not_found'; end if;
  if reported_target_type = 'market_listing' and not exists (
    select 1 from public.market_listings where id = reported_target_id
  ) then raise exception 'report_target_not_found'; end if;
  if reported_target_type = 'market_order' and not exists (
    select 1 from public.market_orders where id = reported_target_id
  ) then raise exception 'report_target_not_found'; end if;
  if reported_target_type = 'tutoring_order' and not exists (
    select 1 from public.tutoring_orders where id = reported_target_id
  ) then raise exception 'report_target_not_found'; end if;
  if reported_target_type = 'conversation' and not exists (
    select 1 from public.conversations where id = reported_target_id
  ) then raise exception 'report_target_not_found'; end if;
  if reported_target_type = 'message' and not exists (
    select 1 from public.messages where id = reported_target_id
  ) then raise exception 'report_target_not_found'; end if;
  if reported_target_type = 'file' and not exists (
    select 1 from public.file_assets where id = reported_target_id
  ) then raise exception 'report_target_not_found'; end if;
  if exists (
    select 1
    from unnest(coalesce(evidence_file_ids, '{}')) requested(file_id)
    left join public.file_assets f on f.id = requested.file_id
    where f.id is null
       or f.owner_id <> auth.uid()
       or f.category <> 'report_evidence'
       or f.scan_status <> 'passed'
  ) then raise exception 'invalid_evidence_file'; end if;

  insert into public.reports (
    reporter_id, target_type, target_id, category, summary
  ) values (
    auth.uid(), reported_target_type, reported_target_id, trim(report_category), trim(report_summary)
  ) returning id into report_id;

  foreach evidence_file_id in array coalesce(evidence_file_ids, '{}') loop
    insert into public.report_evidence (
      report_id, file_id, evidence_type, created_by
    ) values (
      report_id, evidence_file_id, 'file', auth.uid()
    );
  end loop;
  perform public.write_audit_event(
    'report.created', 'report', report_id::text, null,
    jsonb_build_object('reporter_id', auth.uid(), 'target_type', reported_target_type, 'target_id', reported_target_id)
  );
  return report_id;
end;
$$;

create or replace function public.act_on_report(
  target_report_id uuid,
  expected_version integer,
  report_action public.report_action_type,
  action_reason text
)
returns public.report_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_row public.reports%rowtype;
  next_status public.report_status;
  outcome text;
  target_user_id uuid;
  market_order_from public.market_order_status;
  tutoring_order_from public.tutoring_order_status;
begin
  if not public.is_admin() then raise exception 'insufficient_role'; end if;
  if char_length(trim(coalesce(action_reason, ''))) < 5 then raise exception 'reason_too_short'; end if;
  select * into report_row from public.reports where id = target_report_id for update;
  if report_row.id is null then raise exception 'report_not_found'; end if;
  if report_row.version <> expected_version then raise exception 'stale_version'; end if;
  if report_row.status not in ('pending', 'investigating') then raise exception 'report_already_resolved'; end if;
  if report_action = 'escalate' and report_row.status <> 'pending' then raise exception 'report_already_escalated'; end if;

  next_status := case report_action when 'confirm' then 'resolved' when 'dismiss' then 'dismissed' else 'investigating' end;
  outcome := case report_action
    when 'confirm' then 'violation_confirmed_and_safety_action_applied'
    when 'dismiss' then 'report_dismissed'
    else 'escalated_to_super_admin'
  end;

  if report_action = 'escalate' and not public.is_super_admin() then
    raise exception 'super_admin_required_for_escalation';
  end if;
  if report_action = 'confirm'
     and report_row.target_type in ('market_order', 'tutoring_order')
     and (
       (report_row.target_type = 'market_order' and not exists (select 1 from public.market_orders where id = report_row.target_id))
       or (report_row.target_type = 'tutoring_order' and not exists (select 1 from public.tutoring_orders where id = report_row.target_id))
     ) then
    raise exception 'report_target_not_found';
  end if;

  if report_action = 'confirm' then
    if report_row.target_type = 'user' then
      target_user_id := report_row.target_id;
      insert into public.account_restrictions (user_id, scope, reason, ends_at, created_by)
      values (target_user_id, 'messaging', trim(action_reason), now() + interval '7 days', auth.uid());
      insert into public.safety_actions (report_id, target_type, target_id, action_type, ends_at, created_by)
      values (report_row.id, report_row.target_type, report_row.target_id, 'messaging_restricted', now() + interval '7 days', auth.uid());
    elsif report_row.target_type = 'market_listing' then
      update public.market_listings
         set status = 'suspended', version = version + 1
       where id = report_row.target_id;
      insert into public.safety_actions (report_id, target_type, target_id, action_type, created_by)
      values (report_row.id, report_row.target_type, report_row.target_id, 'content_suspended', auth.uid());
    elsif report_row.target_type = 'market_order' then
      select status into market_order_from
      from public.market_orders
      where id = report_row.target_id
      for update;
      update public.market_orders
         set status = 'disputed', version = version + 1
       where id = report_row.target_id;
      insert into public.market_order_events (order_id, from_status, to_status, actor_id, reason)
      select id, market_order_from, 'disputed', auth.uid(), trim(action_reason)
      from public.market_orders
      where id = report_row.target_id;
      insert into public.safety_actions (report_id, target_type, target_id, action_type, created_by)
      values (report_row.id, report_row.target_type, report_row.target_id, 'order_frozen', auth.uid());
    elsif report_row.target_type = 'tutoring_order' then
      select status into tutoring_order_from
      from public.tutoring_orders
      where id = report_row.target_id
      for update;
      update public.tutoring_orders
         set status = 'disputed', version = version + 1
       where id = report_row.target_id;
      insert into public.tutoring_order_events (order_id, from_status, to_status, actor_id, reason)
      select id, tutoring_order_from, 'disputed', auth.uid(), trim(action_reason)
      from public.tutoring_orders
      where id = report_row.target_id;
      insert into public.safety_actions (report_id, target_type, target_id, action_type, created_by)
      values (report_row.id, report_row.target_type, report_row.target_id, 'settlement_paused', auth.uid());
    elsif report_row.target_type = 'conversation' then
      update public.conversations set status = 'frozen' where id = report_row.target_id;
      insert into public.safety_actions (report_id, target_type, target_id, action_type, created_by)
      values (report_row.id, report_row.target_type, report_row.target_id, 'messaging_restricted', auth.uid());
    elsif report_row.target_type = 'message' then
      update public.conversations
         set status = 'frozen'
       where id = (
         select conversation_id from public.messages where id = report_row.target_id
       );
      insert into public.safety_actions (report_id, target_type, target_id, action_type, created_by)
      values (report_row.id, report_row.target_type, report_row.target_id, 'messaging_restricted', auth.uid());
    elsif report_row.target_type = 'file' then
      update public.file_assets
         set scan_status = 'blocked',
             scan_detail = left(trim(action_reason), 500),
             scanned_at = now()
       where id = report_row.target_id;
      insert into public.safety_actions (report_id, target_type, target_id, action_type, created_by)
      values (report_row.id, report_row.target_type, report_row.target_id, 'content_suspended', auth.uid());
    end if;
  end if;

  insert into public.report_actions (
    report_id, report_version, action, reason, outcome, actor_id
  ) values (
    report_row.id, report_row.version, report_action, trim(action_reason), outcome, auth.uid()
  );
  update public.reports
     set status = next_status,
         version = version + 1,
         assigned_to = case when report_action = 'escalate' then null else auth.uid() end,
         resolved_at = case when next_status in ('resolved', 'dismissed') then now() else null end
   where id = report_row.id;
  perform public.write_audit_event(
    'report.actioned', 'report', report_row.id::text,
    to_jsonb(report_row), jsonb_build_object('status', next_status, 'action', report_action, 'reason', action_reason)
  );
  return next_status;
end;
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.payment_intents enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.reports enable row level security;
alter table public.report_evidence enable row level security;
alter table public.report_actions enable row level security;
alter table public.safety_actions enable row level security;

create policy conversations_read_members
  on public.conversations for select to authenticated
  using (public.is_conversation_member(id));

create policy conversation_members_read_members
  on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy messages_read_members
  on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy message_receipts_read_members
  on public.message_receipts for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

create policy payment_intents_read_participant
  on public.payment_intents for select to authenticated
  using (payer_id = auth.uid() or public.is_admin());

create policy reports_read_reporter_or_admin
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy report_evidence_read_creator_or_admin
  on public.report_evidence for select to authenticated
  using (created_by = auth.uid() or public.is_admin());

create policy report_actions_admin_read
  on public.report_actions for select to authenticated
  using (public.is_admin());

create policy safety_actions_admin_read
  on public.safety_actions for select to authenticated
  using (public.is_admin());

create policy file_assets_read_message_participant
  on public.file_assets for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.file_id = file_assets.id
        and public.is_conversation_member(m.conversation_id)
    )
  );

revoke all on public.conversations from anon, authenticated;
revoke all on public.conversation_members from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.message_receipts from anon, authenticated;
revoke all on public.payment_intents from anon, authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;
revoke all on public.ledger_entries from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.report_evidence from anon, authenticated;
revoke all on public.report_actions from anon, authenticated;
revoke all on public.safety_actions from anon, authenticated;

grant select on public.conversations, public.conversation_members, public.messages, public.message_receipts, public.payment_intents, public.reports, public.report_evidence, public.report_actions, public.safety_actions to authenticated;

revoke all on function public.create_order_conversation(public.conversation_kind,uuid,uuid,uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.review_tutoring_match(uuid,integer,public.review_decision,text) from public, anon;
revoke all on function public.apply_payment_webhook(text,text,uuid,public.payment_status,text,jsonb,boolean) from public, anon, authenticated;
revoke all on function public.consent_market_contact_exchange(uuid) from public, anon;
revoke all on function public.get_market_order_counterparty_contact(uuid) from public, anon;
revoke all on function public.send_message(uuid,uuid,text,uuid) from public, anon;
revoke all on function public.mark_conversation_read(uuid,uuid) from public, anon;
revoke all on function public.acknowledge_message_delivery(uuid) from public, anon;
revoke all on function public.create_report(public.report_target_type,uuid,text,text,uuid[]) from public, anon;
revoke all on function public.act_on_report(uuid,integer,public.report_action_type,text) from public, anon;

grant execute on function public.review_tutoring_match(uuid,integer,public.review_decision,text) to authenticated;
grant execute on function public.apply_payment_webhook(text,text,uuid,public.payment_status,text,jsonb,boolean) to service_role;
grant execute on function public.consent_market_contact_exchange(uuid) to authenticated;
grant execute on function public.get_market_order_counterparty_contact(uuid) to authenticated;
grant execute on function public.send_message(uuid,uuid,text,uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid,uuid) to authenticated;
grant execute on function public.acknowledge_message_delivery(uuid) to authenticated;
grant execute on function public.create_report(public.report_target_type,uuid,text,text,uuid[]) to authenticated;
grant execute on function public.act_on_report(uuid,integer,public.report_action_type,text) to authenticated;

-- Helper functions are not an API surface. Keep only the predicates required
-- by RLS and the public currency lookup callable by client roles.
revoke all on function public.has_role(public.app_role,uuid) from public, anon, authenticated;
revoke all on function public.is_super_admin(uuid) from public, anon, authenticated;
revoke all on function public.is_scope_allowed(public.restriction_scope,uuid) from public, anon, authenticated;
revoke all on function public.current_actor_role() from public, anon, authenticated;
revoke all on function public.is_identity_verified(uuid) from public, anon, authenticated;
revoke all on function public.prepare_address() from public, anon, authenticated;
revoke all on function public.restore_default_address_after_delete() from public, anon, authenticated;
revoke all on function public.handle_auth_user_created() from public, anon, authenticated;
revoke all on function public.create_order_conversation(public.conversation_kind,uuid,uuid,uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.create_market_fee_intents() from public, anon, authenticated;
revoke all on function public.create_tutoring_payment_intent() from public, anon, authenticated;
revoke all on function public.create_message_receipts() from public, anon, authenticated;
revoke all on function public.can_read_market_media(text,text) from public, anon, authenticated;

grant execute on function public.currency_for_country(text) to anon, authenticated;
grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.is_account_active(uuid) to authenticated;
grant execute on function public.is_active_mentor(uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid,uuid) to authenticated;
grant execute on function public.can_read_market_media(text,text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('market-media', 'market-media', false, 8388608),
  ('private-documents', 'private-documents', false, 104857600)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

create policy campusloop_storage_upload_own_folder
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('market-media', 'private-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_account_active()
  );

create policy campusloop_market_media_read
  on storage.objects for select
  using (
    bucket_id = 'market-media'
    and public.can_read_market_media(bucket_id, name)
  );

create policy campusloop_private_documents_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'private-documents'
    and exists (
      select 1
      from public.file_assets f
      where f.bucket_id = storage.objects.bucket_id
        and f.object_path = storage.objects.name
        and f.scan_status <> 'blocked'
        and (
          f.owner_id = auth.uid()
          or public.is_admin()
          or exists (
            select 1 from public.tutoring_files tf
            join public.tutoring_orders tutor_order on tutor_order.id = tf.order_id
            where tf.file_id = f.id
              and tf.review_status = 'approved'
              and auth.uid() in (tutor_order.student_id, tutor_order.mentor_id)
          )
          or exists (
            select 1 from public.messages message
            where message.file_id = f.id
              and public.is_conversation_member(message.conversation_id)
          )
        )
    )
  );

create policy campusloop_storage_delete_unlinked_own
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('market-media', 'private-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.file_assets f
      where f.bucket_id = storage.objects.bucket_id
        and f.object_path = storage.objects.name
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.message_receipts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.market_orders;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tutoring_orders;
exception when duplicate_object then null;
end $$;

-- The admin cloud adapter reads listings and their media through RLS.
grant select on table public.market_listings, public.market_listing_media to authenticated;

commit;
