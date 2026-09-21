-- ConsultaJáPsico production pack: whatsapp, subscription expiry, verification,
-- client attendance confirm, mutual ratings, payout release/hold, payout batches.

alter table if exists psychologists
  add column if not exists whatsapp text,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists verification_status text not null default 'pending';

alter table if exists psychologists
  drop constraint if exists psychologists_verification_status_check;
alter table if exists psychologists
  add constraint psychologists_verification_status_check
  check (verification_status in ('pending', 'approved', 'rejected'));

create index if not exists psychologists_verification_idx
  on psychologists (verification_status);

create index if not exists psychologists_subscription_expires_idx
  on psychologists (subscription_expires_at)
  where subscription_status = 'active';

alter table if exists consultation_requests
  add column if not exists attendance_confirmed_by_client boolean not null default false,
  add column if not exists attendance_confirmed_at timestamptz,
  add column if not exists client_rating_of_psych integer,
  add column if not exists client_rating_comment text,
  add column if not exists psych_rating_of_client integer,
  add column if not exists psych_rating_comment text,
  add column if not exists payout_release_status text not null default 'pending_client',
  add column if not exists sac_linked_at timestamptz,
  add column if not exists payout_withheld boolean not null default false,
  add column if not exists payout_withheld_reason text;

alter table if exists consultation_requests
  drop constraint if exists consultation_requests_payout_release_status_check;
alter table if exists consultation_requests
  add constraint consultation_requests_payout_release_status_check
  check (payout_release_status in (
    'pending_client', 'eligible', 'needs_admin_review', 'released', 'denied'
  ));

alter table if exists consultation_requests
  drop constraint if exists consultation_requests_client_rating_check;
alter table if exists consultation_requests
  add constraint consultation_requests_client_rating_check
  check (client_rating_of_psych is null or client_rating_of_psych between 1 and 5);

alter table if exists consultation_requests
  drop constraint if exists consultation_requests_psych_rating_check;
alter table if exists consultation_requests
  add constraint consultation_requests_psych_rating_check
  check (psych_rating_of_client is null or psych_rating_of_client between 1 and 5);

create index if not exists consultation_requests_payout_release_idx
  on consultation_requests (payout_release_status, completed_at desc);

alter table if exists payouts
  add column if not exists payout_batch_id uuid;

create table if not exists payout_batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  status text not null default 'open'
    check (status in ('open', 'paid')),
  total_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

do $$ begin
  alter table payouts
    add constraint payouts_payout_batch_id_fkey
    foreign key (payout_batch_id) references payout_batches (id) on delete set null;
exception when duplicate_object then null;
end $$;

comment on column psychologists.whatsapp is 'E.164 or BR WhatsApp — required on register';
comment on column psychologists.subscription_expires_at is 'Paid monthly unlocks email alerts until this timestamp';
comment on column consultation_requests.payout_release_status is 'pending_client|eligible|needs_admin_review|released|denied — no auto LivePix transfer';
