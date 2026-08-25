-- CampusLoop v2 database contract checks.
-- Run after all migrations in a Supabase project. This file performs only
-- catalog reads and raises an exception on a broken contract.

do $$
declare
  missing_tables text;
  required_table text;
begin
    select string_agg(expected.required_table, ', ' order by expected.required_table)
    into missing_tables
  from (values
    ('profiles'), ('user_private_profiles'), ('user_roles'), ('addresses'),
    ('account_restrictions'), ('mentor_access_allowlist'), ('audit_events'), ('outbox_events'),
    ('notifications'), ('file_assets'), ('platform_settings'),
    ('identity_applications'), ('identity_documents'), ('identity_reviews'),
    ('mentor_profiles'), ('market_listings'), ('market_listing_media'),
    ('market_listing_reviews'), ('market_orders'), ('market_order_reviews'),
    ('market_order_events'), ('market_contact_consents'),
    ('tutoring_requests'), ('tutoring_request_reviews'), ('tutoring_quotes'),
    ('tutoring_quote_selections'), ('tutoring_orders'),
    ('tutoring_order_events'), ('tutoring_files'), ('conversations'),
    ('conversation_members'), ('messages'), ('message_receipts'),
    ('payment_intents'), ('payment_webhook_events'), ('ledger_entries'),
    ('reports'), ('report_evidence'), ('report_actions'), ('safety_actions')
  ) as expected(required_table)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.required_table
      and c.relkind = 'r'
  );

  if missing_tables is not null then
    raise exception 'missing CampusLoop tables: %', missing_tables;
  end if;
end;
$$;

do $$
declare
  missing_rls text;
begin
  select string_agg(relname, ', ' order by relname)
    into missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any (array[
      'profiles', 'user_private_profiles', 'user_roles', 'addresses',
      'account_restrictions', 'mentor_access_allowlist', 'audit_events', 'outbox_events',
      'notifications', 'file_assets', 'platform_settings',
      'identity_applications', 'identity_documents', 'identity_reviews',
      'mentor_profiles', 'market_listings', 'market_listing_media',
      'market_listing_reviews', 'market_orders', 'market_order_reviews',
      'market_order_events', 'market_contact_consents', 'tutoring_requests',
      'tutoring_request_reviews', 'tutoring_quotes',
      'tutoring_quote_selections', 'tutoring_orders', 'tutoring_order_events',
      'tutoring_files', 'conversations', 'conversation_members', 'messages',
      'message_receipts', 'payment_intents', 'payment_webhook_events',
      'ledger_entries', 'reports', 'report_evidence', 'report_actions',
      'safety_actions'
    ])
    and not c.relrowsecurity;

  if missing_rls is not null then
    raise exception 'RLS is disabled on: %', missing_rls;
  end if;
end;
$$;

do $$
declare
  country_count integer;
  mapped_count integer;
begin
  select count(*) into country_count from public.country_currency_rules;
  select count(*) into mapped_count
    from public.country_currency_rules
   where country_code in ('CN', 'GB', 'MY', 'US', 'AU', 'CA')
     and currency_code in ('CNY', 'GBP', 'MYR', 'USD', 'AUD', 'CAD');
  if country_count < 190 then
    raise exception 'country currency map is incomplete: % rows', country_count;
  end if;
  if mapped_count <> 6 then
    raise exception 'required country currency mappings are missing';
  end if;
end;
$$;

do $$
declare
  required_policy text;
begin
  for required_policy in
    select policy_name
    from (values
      ('profiles_public_read'),
      ('mentor_access_allowlist_super_admin_read'),
      ('addresses_read'),
      ('market_listings_read'),
      ('tutoring_requests_read_owner_or_admin'),
      ('conversations_read_members'),
      ('messages_read_members'),
      ('notifications_read_own'),
      ('campusloop_storage_upload_own_folder')
    ) as expected(policy_name)
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname in ('public', 'storage')
        and policyname = required_policy
    ) then
      raise exception 'required policy is missing: %', required_policy;
    end if;
  end loop;
end;
$$;

do $$
declare
  protected_table text;
begin
  -- These tables are written only by RPCs, triggers, or trusted payment
  -- workers. Direct client writes would bypass the workflow state machines.
  for protected_table in
    select table_name
    from (values
      ('identity_applications'), ('identity_reviews'),
      ('market_listings'), ('market_listing_reviews'), ('market_orders'),
      ('market_order_reviews'), ('market_order_events'),
      ('tutoring_requests'), ('tutoring_request_reviews'), ('tutoring_quotes'),
      ('tutoring_quote_selections'), ('tutoring_orders'),
      ('tutoring_order_events'), ('tutoring_files'), ('messages'),
      ('payment_intents'), ('payment_webhook_events'), ('ledger_entries'),
      ('reports'), ('report_actions'), ('safety_actions')
    ) as expected(table_name)
  loop
    if exists (select 1 from pg_roles where rolname = 'anon')
       and (
         has_table_privilege('anon', format('public.%s', protected_table), 'INSERT')
         or has_table_privilege('anon', format('public.%s', protected_table), 'UPDATE')
         or has_table_privilege('anon', format('public.%s', protected_table), 'DELETE')
       ) then
      raise exception 'anon has a direct write grant on %', protected_table;
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated')
       and (
         has_table_privilege('authenticated', format('public.%s', protected_table), 'INSERT')
         or has_table_privilege('authenticated', format('public.%s', protected_table), 'UPDATE')
         or has_table_privilege('authenticated', format('public.%s', protected_table), 'DELETE')
       ) then
      raise exception 'authenticated has a direct write grant on %', protected_table;
    end if;
  end loop;
end;
$$;

do $$
declare
  required_function text;
begin
  for required_function in
    select function_signature
    from (values
      ('public.submit_identity_application(text,text,text,uuid)'),
      ('public.review_identity_application(uuid,integer,public.review_decision,text)'),
      ('public.submit_market_listing(uuid,text,text,text,text,bigint,integer,text[],uuid[])'),
      ('public.get_market_feed(text,text,text)'),
      ('public.review_market_listing(uuid,integer,public.review_decision,text)'),
      ('public.create_market_order(uuid,integer,uuid)'),
      ('public.review_market_order(uuid,integer,public.review_decision,text)'),
      ('public.create_tutoring_request(uuid,text,text,text,text,text,text,timestamptz,uuid[])'),
      ('public.get_mentor_open_requests()'),
      ('public.submit_tutoring_quote(uuid,bigint,text,text)'),
      ('public.select_tutoring_quote(uuid)'),
      ('public.review_tutoring_match(uuid,integer,public.review_decision,text)'),
      ('public.send_message(uuid,uuid,text,uuid)'),
      ('public.mark_conversation_read(uuid,uuid)'),
      ('public.acknowledge_message_delivery(uuid)'),
      ('public.apply_payment_webhook(text,text,uuid,public.payment_status,text,jsonb,boolean)'),
      ('public.create_report(public.report_target_type,uuid,text,text,uuid[])'),
      ('public.act_on_report(uuid,integer,public.report_action_type,text)'),
      ('public.ban_user_account(uuid,text,timestamptz)'),
      ('public.unban_user_account(uuid,text)'),
      ('public.set_platform_setting(text,jsonb)'),
      ('public.mark_notification_read(uuid)'),
      ('public.bind_mentor_account(text,uuid)'),
      ('public.activate_mentor_account(uuid,text,text[],text[])')
    ) as expected(function_signature)
  loop
    if to_regprocedure(required_function) is null then
      raise exception 'required RPC is missing: %', required_function;
    end if;
  end loop;
end;
$$;

do $$
declare
  insecure_functions text;
begin
  select string_agg(n.nspname || '.' || p.proname, ', ' order by p.proname)
    into insecure_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and p.proname = any (array[
      'currency_for_country', 'prepare_address',
      'restore_default_address_after_delete', 'handle_auth_user_created',
      'has_role', 'is_admin', 'is_super_admin', 'is_scope_allowed',
      'is_account_active', 'current_actor_role', 'write_audit_event',
      'enqueue_notification', 'set_user_role', 'ban_user_account',
      'unban_user_account', 'set_platform_setting', 'mark_notification_read',
      'bind_mentor_account', 'activate_mentor_account', 'is_identity_verified', 'is_active_mentor',
      'submit_identity_application', 'review_identity_application',
      'submit_market_listing', 'get_market_feed', 'review_market_listing', 'create_market_order',
      'review_market_order', 'create_tutoring_request',
      'review_tutoring_request', 'get_mentor_open_requests',
      'submit_tutoring_quote', 'select_tutoring_quote',
      'submit_tutoring_delivery', 'review_tutoring_file',
      'transition_tutoring_order', 'is_conversation_member',
      'create_order_conversation', 'review_tutoring_match',
      'create_market_fee_intents', 'create_tutoring_payment_intent',
      'can_read_market_media',
      'apply_payment_webhook', 'consent_market_contact_exchange',
      'get_market_order_counterparty_contact', 'create_message_receipts',
      'send_message', 'mark_conversation_read', 'create_report',
      'act_on_report'
    ])
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
      where setting like 'search_path=%'
    );
  if insecure_functions is not null then
    raise exception 'SECURITY DEFINER function without fixed search_path: %', insecure_functions;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    if not has_function_privilege('authenticated', 'public.send_message(uuid,uuid,text,uuid)', 'EXECUTE')
       or not has_function_privilege('authenticated', 'public.acknowledge_message_delivery(uuid)', 'EXECUTE')
       or not has_function_privilege('authenticated', 'public.is_super_admin(uuid)', 'EXECUTE') then
      raise exception 'authenticated RPC/policy grants are incomplete';
    end if;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role')
     and not has_function_privilege(
       'service_role',
       'public.apply_payment_webhook(text,text,uuid,public.payment_status,text,jsonb,boolean)',
       'EXECUTE'
     ) then
    raise exception 'service_role payment webhook grant is missing';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon')
     and has_function_privilege('anon', 'public.apply_payment_webhook(text,text,uuid,public.payment_status,text,jsonb,boolean)', 'EXECUTE') then
    raise exception 'anon can execute payment webhook';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon')
     and (
       has_column_privilege('anon', 'public.market_listings', 'address_id', 'SELECT')
       or has_column_privilege('anon', 'public.market_listings', 'legacy_id', 'SELECT')
       or has_column_privilege('anon', 'public.market_listing_media', 'file_id', 'SELECT')
     ) then
    raise exception 'anon can read private market linkage columns';
  end if;
end;
$$;

do $$
declare
  bucket_count integer;
begin
  if to_regclass('storage.buckets') is null then
    raise exception 'storage.buckets is missing';
  end if;
  select count(*) into bucket_count
    from storage.buckets
   where id in ('market-media', 'private-documents')
     and public = false;
  if bucket_count <> 2 then
    raise exception 'private storage buckets are not configured';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_campusloop_auth_created'
       or tgname = 'on_campusloop_auth_user_created'
  ) then
    raise exception 'auth user provisioning trigger is missing';
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'messages_create_receipts'
  ) then
    raise exception 'message receipt trigger is missing';
  end if;
end;
$$;

select 'CampusLoop database contract: PASS' as result;
