-- The admin cloud adapter reads reviewed listings and their media through
-- RLS, so authenticated administrators need table-level SELECT privileges.
-- Row-level policies remain the source of truth for which rows are visible.
grant select on table public.market_listings, public.market_listing_media to authenticated;
