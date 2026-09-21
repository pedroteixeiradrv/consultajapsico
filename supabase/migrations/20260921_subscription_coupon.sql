-- Admin-configurable free subscription coupon (30 days)
alter table if exists platform_settings
  add column if not exists subscription_coupon_code text;

comment on column platform_settings.subscription_coupon_code is
  'Keyword for free 30-day mensalidade; null/empty = disabled (case-insensitive trim match)';
