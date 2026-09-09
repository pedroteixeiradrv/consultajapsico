-- ConsultaJáPsico — PHASE 1 schema (Supabase-ready)
-- Posicionamento: apoio psicológico rápido
-- MVP: somente pacientes identificados (sem fluxo anônimo)
-- Preços (cents BRL): identificado R$50/30min → psicólogo R$40
-- Payout Pix ao psicólogo SOMENTE após sessão completed / timer 30min
-- SAC: somente admin lê
-- Advogados: FORA DE ESCOPO (futuro)

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- platform_settings (singleton-ish; app usa a primeira linha)
-- ---------------------------------------------------------------------------
create table if not exists platform_settings (
  id uuid primary key default gen_random_uuid(),
  monthly_fee_cents integer not null default 9900,       -- mensalidade psicólogo (LivePix depois)
  price_id_cents integer not null default 5000,          -- cliente identificado: R$50 / 30min
  psych_cut_id_cents integer not null default 4000,      -- corte psicólogo identificado: R$40
  session_duration_minutes integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into platform_settings default values
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- admins — primeiro acesso cria; segundo signup = erro (enforced na app + unique email)
-- ---------------------------------------------------------------------------
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Garante no máximo 1 admin via constraint parcial (PostgreSQL)
-- App também rejeita segundo signup; esta constraint reforça.
create unique index if not exists admins_single_row
  on admins ((true));

-- ---------------------------------------------------------------------------
-- psychologists
-- ---------------------------------------------------------------------------
-- Mensalidade: active = recebe e-mail de solicitações.
-- Online (mesmo sem mensalidade) = pode Aceitar na fila + payout após 30min.
-- Lucro plataforma = split da consulta.
create table if not exists psychologists (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  crp text,                                              -- CRP (opcional no skeleton)
  pix_key text,                                          -- chave Pix para payout
  subscription_status text not null default 'pending'
    check (subscription_status in ('pending', 'active', 'past_due', 'cancelled')),
  online boolean not null default false,                 -- online pode aceitar fila (mesmo sem mensalidade)
  payout_balance_cents integer not null default 0,       -- acumulado após sessões completed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fila: quem está online (mensalidade NÃO obrigatória para aceitar)
create index if not exists psychologists_online_idx
  on psychologists (online) where online = true;

-- E-mail blast: só mensalidade active
create index if not exists psychologists_email_blast_idx
  on psychologists (subscription_status) where subscription_status = 'active';

-- ---------------------------------------------------------------------------
-- clients (identificados: conta + créditos)
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  credits_cents integer not null default 0,              -- saldo em centavos
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- consultation_requests / sessions
-- status: pending | accepted | in_call | completed | cancelled
-- psych_id nullable até aceitar
-- MVP: somente clientes identificados (sem anonymous_users / kind anon)
-- ---------------------------------------------------------------------------
create table if not exists consultation_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'in_call', 'completed', 'cancelled')),
  client_id uuid not null references clients (id) on delete cascade,
  psychologist_id uuid references psychologists (id) on delete set null, -- null até accept
  price_cents integer not null,                          -- cobrado do usuário
  psych_cut_cents integer not null,                      -- crédito ao psicólogo após completed
  paid_at timestamptz,
  accepted_at timestamptz,
  call_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  -- Reembolso: NÃO automático; somente via SAC com comprovante
  refund_requested boolean not null default false,
  refunded_at timestamptz,
  payout_credited boolean not null default false,        -- crédito ao psicólogo já aplicado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultation_requests_pending_idx
  on consultation_requests (status, created_at)
  where status = 'pending';

create index if not exists consultation_requests_psych_idx
  on consultation_requests (psychologist_id, status);

-- ---------------------------------------------------------------------------
-- credits_ledger (movimentações de crédito de clientes identificados)
-- ---------------------------------------------------------------------------
create table if not exists credits_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  amount_cents integer not null,                         -- positivo = crédito; negativo = débito
  reason text not null,                                  -- purchase | session_charge | refund_sac | adjustment
  consultation_request_id uuid references consultation_requests (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists credits_ledger_client_idx
  on credits_ledger (client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- sac_tickets — formulário público; SOMENTE admin lê
-- ---------------------------------------------------------------------------
create table if not exists sac_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_email text,
  subject text not null,
  body text not null,
  consultation_request_id uuid references consultation_requests (id) on delete set null,
  proof_note text,                                       -- referência a comprovante (reembolso só via SAC)
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sac_tickets_status_idx
  on sac_tickets (status, created_at desc);

-- ---------------------------------------------------------------------------
-- payouts (histórico; Pix ao psicólogo APÓS session completed)
-- ---------------------------------------------------------------------------
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references psychologists (id) on delete cascade,
  consultation_request_id uuid references consultation_requests (id) on delete set null,
  amount_cents integer not null,
  pix_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed')),
  provider_ref text,                                     -- LivePix / outro stub
  created_at timestamptz not null default now(),
  paid_at timestamptz
);


-- ---------------------------------------------------------------------------
-- email_log — stub / audit de e-mails enviados (EmailLogEntry)
-- ---------------------------------------------------------------------------
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,                                -- EmailLogEntry.to
  subject text not null,
  reason text not null,                                  -- e.g. new_request_blast | generic
  created_at timestamptz not null default now()
);

create index if not exists email_log_created_idx
  on email_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Notas de produto (comentários SQL)
-- * Psicólogos: registrar, pagar mensalidade (LivePix depois), ficar ONLINE e
--   aceitar fila pendente (não só e-mail).
-- * Cliente identificado: conta + créditos; R$50/30min → R$40 ao psicólogo.
-- * Sem fluxo anônimo no MVP.
-- * Admin: primeiro acesso cria; segundo signup = erro.
-- * Advogados vertical: FORA DE ESCOPO por agora.
