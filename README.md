# ConsultaJáPsico

**Apoio psicológico rápido** — marketplace de sessões curtas (30 min) com psicólogos online.

> Nome: ConsultaJáPsico.  
> Vertical de **advogados**: fora do escopo por enquanto (futuro).

## Visão (MVP)

- **Psicólogos**: registram-se, pagam mensalidade (LivePix depois), ficam **online** e **aceitam a fila pendente** (não é atendimento só por e-mail).
- **Cliente identificado**: conta + créditos. **R$50 / 30 min** → **R$40** ao psicólogo após a sessão terminar. **Somente pacientes identificados** neste MVP (fluxo anônimo removido).
- **SAC**: formulário público geral; **somente admin** lê.
- **Admin**: primeiro acesso cria usuário + senha; segundo signup de admin = erro.
- **Payout Pix** ao psicólogo **somente depois** de sessão `completed` / timer de 30 min.

## Stack (fase 1 — skeleton)

- Next.js 14 (App Router) + TypeScript + Tailwind
- Schema Supabase em `supabase/schema.sql` (projeto live ainda não obrigatório)
- LivePix / LiveKit / Resend: **stubs** em `lib/` + `.env.example` (sem chaves reais)

## Como rodar

```bash
cd consultaja
cp .env.example .env.local   # opcional nesta fase
npm install
npm run dev                  # http://localhost:3000
npm run build                # deve passar em verde
```

## Variáveis de ambiente

Veja `.env.example`:

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_APP_URL` | URL do app |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (próxima fase) |
| `LIVEPIX_*` | Pagamentos (stub) |
| `LIVEKIT_*` / `NEXT_PUBLIC_LIVEKIT_URL` | Sala voz/vídeo (stub) |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail (stub; fila **não** é e-mail-only) |

**Não commitar segredos.**

## Rotas (skeleton)

| Rota | Descrição |
|------|-----------|
| `/` | Landing — apoio psicológico rápido |
| `/admin/setup` | Primeiro admin |
| `/admin/login` | Login admin |
| `/admin` | Dashboard admin (stub) |
| `/admin/sac` | Lista SAC (só admin) |
| `/psych/register` | Cadastro psicólogo |
| `/psych/login` | Login psicólogo |
| `/psych/dashboard` | Toggle online + fila pendente |
| `/client/register` | Cadastro cliente |
| `/client/login` | Login cliente |
| `/client/dashboard` | Créditos (stub) |
| `/standby/[requestId]` | Sala de espera |
| `/call/[requestId]` | Stub da chamada (LiveKit depois) |
| `/sac` | Formulário público SAC |

## Schema (tabelas)

Em `supabase/schema.sql`:

- `admins` — no máximo 1 (app + índice único)
- `psychologists` — perfil, `subscription_status`, `online`, `payout_balance_cents`
- `clients` — identificados + créditos
- `consultation_requests` — `pending|accepted|in_call|completed|cancelled`, valores, `psychologist_id` nullable até accept (somente `client_id`)
- `credits_ledger`
- `sac_tickets` — admin-only na leitura
- `platform_settings` — mensalidade e preço/corte identificados
- `payouts` — histórico Pix pós-`completed`

## Stub vs. próximo

| Já no skeleton | Próximo |
|----------------|---------|
| UI PT + rotas | Auth real + middleware |
| Schema SQL | Projeto Supabase + RLS |
| `lib/livepix.ts` | Checkout/webhooks LivePix |
| `lib/livekit.ts` | Tokens e room reais |
| `lib/email.ts` | Resend (avisos; fila continua online) |
| `lib/payout.ts` | Pix após `completed` |
| Forms sem persistência | Server Actions / API |

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servir build
- `npm run lint` — ESLint

## Posicionamento

ConsultaJáPsico = **apoio psicológico rápido**. Não é terapia de longo prazo neste MVP. Advogados e outras verticais ficam para depois.

## Deploy

Produção será um **novo projeto Vercel** (ConsultaJáPsico) — **não** reutilizar brazil-likes-ig / BrazilLikesIG.


## Regras de negócio (MVP)

### Mensalidade do psicólogo (prospecção)
- **Sem mensalidade:** não recebe e-mail de novas solicitações.
- **Online no dashboard:** pode **Aceitar** pedidos pendentes mesmo sem mensalidade e recebe o repasse após os 30 min.
- A plataforma lucra no split da consulta (ex.: R$10 id). Mensalidade paga = prioridade por e-mail.
