-- Idempotent patch if Phase-1 schema ran before payout_credited / email_log existed
alter table if exists consultation_requests
  add column if not exists payout_credited boolean not null default false;

create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists email_log_created_idx
  on email_log (created_at desc);
