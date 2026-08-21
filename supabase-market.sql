-- Run this file once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.market_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.market_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.market_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default '£',
  country text not null,
  city text not null,
  area text not null,
  description text not null default '',
  image text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.market_conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.market_items(id) on delete restrict,
  buyer_id uuid not null references public.market_profiles(id) on delete cascade,
  seller_id uuid not null references public.market_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_conversations_different_users check (buyer_id <> seller_id),
  constraint market_conversations_unique unique (item_id, buyer_id, seller_id)
);

create table if not exists public.market_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  sender_id uuid not null references public.market_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.market_conversation_members (
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  user_id uuid not null references public.market_profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create or replace function public.handle_market_user_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.market_profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_market_auth_user_created on auth.users;
create trigger on_market_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_market_user_created();

create or replace function public.open_market_conversation(target_item_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target_seller uuid;
  conversation_id uuid;
begin
  select seller_id into target_seller from public.market_items where id = target_item_id and is_active = true;
  if target_seller is null then raise exception 'Item not found'; end if;
  if target_seller = auth.uid() then raise exception 'Cannot message your own listing'; end if;

  insert into public.market_conversations (item_id, buyer_id, seller_id)
  values (target_item_id, auth.uid(), target_seller)
  on conflict (item_id, buyer_id, seller_id)
  do update set updated_at = public.market_conversations.updated_at
  returning id into conversation_id;

  insert into public.market_conversation_members (conversation_id, user_id)
  values (conversation_id, auth.uid()), (conversation_id, target_seller)
  on conflict do nothing;
  return conversation_id;
end;
$$;

alter table public.market_profiles enable row level security;
alter table public.market_items enable row level security;
alter table public.market_conversations enable row level security;
alter table public.market_messages enable row level security;
alter table public.market_conversation_members enable row level security;

drop policy if exists "profiles visible to signed in users" on public.market_profiles;
drop policy if exists "display names are publicly readable" on public.market_profiles;
create policy "display names are publicly readable" on public.market_profiles for select using (true);
drop policy if exists "users update own profile" on public.market_profiles;
create policy "users update own profile" on public.market_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "items are publicly readable" on public.market_items;
create policy "items are publicly readable" on public.market_items for select using (true);
drop policy if exists "users create own items" on public.market_items;
create policy "users create own items" on public.market_items for insert to authenticated with check (seller_id = auth.uid());
drop policy if exists "users update own items" on public.market_items;
create policy "users update own items" on public.market_items for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
drop policy if exists "users delete own items" on public.market_items;
create policy "users delete own items" on public.market_items for delete to authenticated using (seller_id = auth.uid());

drop policy if exists "participants read conversations" on public.market_conversations;
create policy "participants read conversations" on public.market_conversations for select to authenticated using (auth.uid() in (buyer_id, seller_id));

drop policy if exists "participants read messages" on public.market_messages;
create policy "participants read messages" on public.market_messages for select to authenticated using (
  exists (select 1 from public.market_conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id))
);
drop policy if exists "participants send messages" on public.market_messages;
create policy "participants send messages" on public.market_messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.market_conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id))
);

create or replace function public.touch_market_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.market_conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_market_message_created on public.market_messages;
create trigger on_market_message_created
  after insert on public.market_messages
  for each row execute procedure public.touch_market_conversation();

drop policy if exists "participants read memberships" on public.market_conversation_members;
create policy "participants read memberships" on public.market_conversation_members for select to authenticated using (
  exists (select 1 from public.market_conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id))
);
drop policy if exists "users update own membership" on public.market_conversation_members;
create policy "users update own membership" on public.market_conversation_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on function public.open_market_conversation(uuid) from public, anon;
grant execute on function public.open_market_conversation(uuid) to authenticated;
grant select on public.market_items to anon, authenticated;
grant select, insert, update, delete on public.market_items to authenticated;
grant select on public.market_profiles to anon, authenticated;
grant select on public.market_conversations, public.market_messages, public.market_conversation_members to authenticated;
grant insert on public.market_messages to authenticated;
grant update on public.market_conversation_members to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.market_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.market_conversation_members;
exception when duplicate_object then null;
end $$;
