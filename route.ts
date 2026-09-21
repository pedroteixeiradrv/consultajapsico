import { NextRequest, NextResponse } from "next/server";
import { markConsultationPaid } from "@/lib/actions/session";
import {
  checkPaidAmount,
  getLivePixEnv,
} from "@/lib/livepix";
import {
  expiresIn30DaysIso,
  parseSubscriptionRef,
} from "@/lib/demo";
import { mutateStore, nowIso, readStore } from "@/lib/store";

/**
 * LivePix webhook — POST /api/payments/livepix/webhook
 * Payload shape (docs): { event, resource: { id, reference, type } }
 * Also accepts { requestId } / { reference } / subscription activation fields.
 * Amount guard: if amount present and ≠ expected → do NOT mark paid / activate.
 */

async function activatePsychSubscription(psychologistId: string) {
  await mutateStore((db) => {
    const p = db.psychologists.find((x) => x.id === psychologistId);
    if (!p) return;
    p.subscription_status = "active";
    p.subscription_expires_at = expiresIn30DaysIso();
    p.updated_at = nowIso();
  });
}

export async function POST(req: NextRequest) {
  const secret = getLivePixEnv().webhookSecret;
  if (secret) {
    const header =
      req.headers.get("x-livepix-secret") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (header !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const db = await readStore();
  const expectedMonthly =
    db.platform_settings.monthly_fee_cents ?? 9900;

  // Explicit subscription activation (demo / optional LivePix metadata)
  if (body.kind === "subscription" && typeof body.psychologistId === "string") {
    const check = checkPaidAmount(body, expectedMonthly);
    if (check.status === "mismatch") {
      console.warn(
        "[livepix webhook] subscription amount_mismatch",
        body.psychologistId,
        check.amountCents,
        expectedMonthly
      );
      return NextResponse.json(
        {
          ok: true,
          kind: "subscription",
          activated: false,
          detail: "amount_mismatch",
          paidAmountCents: check.amountCents,
          expectedCents: expectedMonthly,
        },
        { status: 200 }
      );
    }
    if (check.status === "missing") {
      console.warn(
        "[livepix webhook] subscription amount missing; activating anyway",
        body.psychologistId
      );
    }
    await activatePsychSubscription(body.psychologistId);
    return NextResponse.json({ ok: true, kind: "subscription", activated: true });
  }

  const resource =
    body.resource && typeof body.resource === "object"
      ? (body.resource as Record<string, unknown>)
      : null;

  const requestId =
    (typeof body.requestId === "string" && body.requestId) ||
    (typeof body.paymentId === "string" && body.paymentId) ||
    (typeof body.reference === "string" && body.reference) ||
    (resource && typeof resource.reference === "string" && resource.reference) ||
    null;

  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: "requestId ou reference obrigatório" },
      { status: 400 }
    );
  }

  // Subscription via LivePix reference `sub:<psychId>:...`
  const subRef = parseSubscriptionRef(requestId);
  if (subRef) {
    const check = checkPaidAmount(body, expectedMonthly);
    if (check.status === "mismatch") {
      console.warn(
        "[livepix webhook] subscription ref amount_mismatch",
        subRef.psychologistId,
        check.amountCents,
        expectedMonthly
      );
      return NextResponse.json(
        {
          ok: true,
          kind: "subscription",
          activated: false,
          detail: "amount_mismatch",
          paidAmountCents: check.amountCents,
          expectedCents: expectedMonthly,
        },
        { status: 200 }
      );
    }
    if (check.status === "missing") {
      console.warn(
        "[livepix webhook] subscription ref amount missing; activating anyway",
        subRef.psychologistId
      );
    }
    const psych = db.psychologists.find((x) => x.id === subRef.psychologistId);
    if (!psych) {
      return NextResponse.json(
        { ok: true, matched: false, detail: "Psicólogo não encontrado" },
        { status: 200 }
      );
    }
    await activatePsychSubscription(subRef.psychologistId);
    return NextResponse.json({
      ok: true,
      kind: "subscription",
      activated: true,
      psychologistId: subRef.psychologistId,
    });
  }

  const consultation = db.consultation_requests.find((r) => r.id === requestId);
  if (!consultation) {
    // Avoid webhook retry storms for unknown refs
    return NextResponse.json(
      { ok: true, matched: false, detail: "Pedido não encontrado" },
      { status: 200 }
    );
  }

  const check = checkPaidAmount(body, consultation.price_cents);
  if (check.status === "mismatch") {
    await mutateStore((d) => {
      const req = d.consultation_requests.find((r) => r.id === requestId);
      if (!req || req.paid_at) return;
      req.payment_mismatch_cents = check.amountCents;
      req.cancel_reason = `amount_mismatch: paid ${check.amountCents} expected ${consultation.price_cents}`;
      req.updated_at = nowIso();
    });
    console.warn(
      "[livepix webhook] consultation amount_mismatch",
      requestId,
      check.amountCents,
      consultation.price_cents
    );
    return NextResponse.json(
      {
        ok: true,
        matched: true,
        paid: false,
        detail: "amount_mismatch",
        paidAmountCents: check.amountCents,
        expectedCents: consultation.price_cents,
      },
      { status: 200 }
    );
  }
  if (check.status === "missing") {
    console.warn(
      "[livepix webhook] consultation amount missing; marking paid",
      requestId
    );
  }

  const result = await markConsultationPaid(
    requestId,
    consultation.client_id,
    check.status === "match" ? { paidAmountCents: check.amountCents } : undefined
  );
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: true,
        matched: true,
        paid: false,
        detail: result.detail ?? result.error,
      },
      { status: 200 }
    );
  }
  return NextResponse.json({ ok: true, matched: true, paid: true, requestId });
}
