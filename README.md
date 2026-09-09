# ConsultaJáPsico

**Apoio psicológico rápido** — marketplace de sessões curtas (30 min) com psicólogos online.

> Nome: ConsultaJáPsico.  
> Vertical de **advogados**: fora do escopo por enquanto (futuro).

## Visão (MVP)

- **Psicólogos**: registram-se, (opcional) mensalidade, ficam **online** e **aceitam a fila pendente**.
- **Cliente identificado**: conta. **R$50 / 30 min** → **R$40** ao psicólogo após `completed`. **Somente pacientes identificados** (sem anônimo).
- **SAC**: formulário público; **somente admin** lê.
- **Admin**: primeiro acesso cria usuário + senha; segundo signup de admin = erro.
- **Payout Pix** ao psicólogo **somente depois** de sessão `completed` / timer 30 min / Encerrar.

## Stack (fase 2 — usable local demo)

- Next.js 14 (App Router) + TypeScript + Tailwind
- Persistência **local JSON** em `data/store.json` (zero-config). `better-sqlite3` falhou no build nativo deste ambiente — interface em `lib/store` pronta para trocar.
- Schema Supabase em `supabase/schema.sql` + stub client em `lib/supabase.ts` quando env estiver setado.
- Auth: cookies assinados (**jose**) + senhas **bcryptjs**.
- LivePix / LiveKit / Resend: stubs; pagamento demo via `POST /api/payments/stub-confirm`.

## Como rodar

```bash
cd consultaja
cp .env.example .env.local   # opcional; SESSION_SECRET recomendado
npm install
npm run dev                  # http://localhost:3000
npm run build                # deve passar em verde
```

Dados locais ficam em `data/store.json` (gitignored). Apague o arquivo para resetar o demo.

## Demo walkthrough (sem serviços externos)

Use **duas janelas** (ou perfis) do navegador — um para psicólogo, um para cliente. Admin pode ser a mesma ou outra.

1. **Admin bootstrap**  
   Abra `/admin/setup` → e-mail + senha → cria o único admin e entra em `/admin`.  
   Tentar `/admin/setup` de novo redireciona / segundo create falha.

2. **Psicólogo**  
   `/psych/register` → nome, e-mail, senha, Pix → dashboard.  
   Clique **Ficar online**. (Mensalidade pode ficar `pending`; ainda assim pode Aceitar.)

3. **Cliente**  
   `/client/register` → dashboard → **Pedir consulta** → **Confirmar pagamento (stub)** → `/standby/[id]`.

4. **Aceite**  
   No painel do psicólogo, a fila mostra o pedido pago → **Aceitar** (first-wins) → ambos vão para `/call/[id]`.

5. **Encerrar → payout**  
   Psicólogo (ou admin) clica **Encerrar sessão** (ou aguarde 30 min).  
   Status `completed` → saldo payout do psicólogo **+ R$40**.

6. **SAC**  
   `/sac` envia ticket → aparece em `/admin/sac`.

7. **Mensalidade / e-mail**  
   Sem `subscription_status=active`, o stub **não** registra e-mail de nova solicitação (`data/store.json` → `email_log`).  
   No dashboard do psych: “(demo) Ativar mensalidade stub” → próximos pagamentos geram log de e-mail. Online continua podendo Aceitar.

8. **Segundo admin**  
   Com admin já existente, novo create em setup é bloqueado.

### API de pagamento stub

```bash
curl -X POST http://localhost:3000/api/payments/stub-confirm \
  -H 'content-type: application/json' \
  -d '{"requestId":"<uuid>"}'
```

## Variáveis de ambiente

Veja `.env.example`:

| Variável | Uso |
|----------|-----|
| `SESSION_SECRET` | Assinatura do cookie `cj_session` |
| `NEXT_PUBLIC_APP_URL` | URL do app |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (opcional) |
| `LIVEPIX_*` | Pagamentos (stub + stub-confirm) |
| `LIVEKIT_*` / `NEXT_PUBLIC_LIVEKIT_URL` | Sala voz/vídeo (stub) |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail (stub; fila **não** é e-mail-only) |

**Não commitar segredos.**

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Landing |
| `/admin/setup` | Primeiro admin (só se nenhum existir) |
| `/admin/login` | Login admin |
| `/admin` | Dashboard admin |
| `/admin/sac` | Lista SAC |
| `/psych/register` · `/psych/login` · `/psych/dashboard` | Psicólogo |
| `/client/register` · `/client/login` · `/client/dashboard` | Cliente |
| `/standby/[requestId]` | Espera (polling) |
| `/call/[requestId]` | Chamada stub + Encerrar |
| `/sac` | Formulário público SAC |
| `POST /api/payments/stub-confirm` | Simula webhook LivePix |
| `GET /api/requests/[id]/status` | Status para polling |

## Schema (tabelas)

Em `supabase/schema.sql` (espelhado no JSON store):

- `admins` — no máximo 1
- `psychologists` — `subscription_status`, `online`, `payout_balance_cents`
- `clients`
- `consultation_requests` — `pending|accepted|in_call|completed|cancelled`
- `credits_ledger`, `sac_tickets`, `platform_settings`, `payouts`

## Regras de negócio (MVP)

### Mensalidade do psicólogo
- **Sem mensalidade:** não recebe e-mail de novas solicitações.
- **Online no dashboard:** pode **Aceitar** pedidos pendentes mesmo sem mensalidade e recebe o repasse após completed.
- Lucro plataforma = split da consulta (R$10). Mensalidade = prioridade por e-mail.

### Payout
- Nunca no accept/pending. Só após `completed` (botão Encerrar, admin, ou timer 30 min).

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servir build
- `npm run lint` — ESLint

## Deploy

Produção será um **novo projeto Vercel** (ConsultaJáPsico) — **não** reutilizar brazil-likes-ig / BrazilLikesIG.
