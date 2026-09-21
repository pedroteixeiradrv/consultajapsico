-- LivePix underpayment guard: store mismatched paid amount (cents)
alter table if exists consultation_requests
  add column if not exists payment_mismatch_cents integer;

comment on column consultation_requests.payment_mismatch_cents is
  'When LivePix webhook amount ≠ price_cents, store received amount; request stays unpaid';
