"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, formatBRL, StubNote } from "@/components/ui";
import {
  createConsultationAction,
  confirmStubPaymentAction,
} from "@/lib/actions/client";

export function ClientDashboardClient({
  creditsCents,
  payRequestId,
  payAmountCents,
  recent,
}: {
  creditsCents: number;
  payRequestId?: string;
  payAmountCents?: number;
  recent: { id: string; status: string; paid: boolean }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">Créditos</h2>
        <p className="text-3xl font-bold text-teal-700">
          {formatBRL(creditsCents)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Cada sessão de 30 min custa R$50 (pagamento stub no pedido).
        </p>
      </Card>

      {payRequestId && (
        <Card className="mb-4 border-teal-200">
          <h2 className="mb-2 font-semibold">Pagamento stub (LivePix)</h2>
          <p className="mb-3 text-sm text-slate-600">
            Pedido{" "}
            <code className="rounded bg-slate-100 px-1">
              {payRequestId.slice(0, 8)}
            </code>{" "}
            · {formatBRL(payAmountCents ?? 5000)}. Confirme para simular o
            webhook.
          </p>
          <button
            type="button"
            disabled={pending}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await confirmStubPaymentAction(payRequestId);
                if (r && !r.ok) setError(r.error);
              })
            }
          >
            Confirmar pagamento (stub)
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Ou:{" "}
            <code className="text-xs">
              POST /api/payments/stub-confirm {"{"}&quot;requestId&quot;:&quot;
              {payRequestId}&quot;{"}"}
            </code>
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">Iniciar consulta</h2>
        <p className="mb-3 text-sm text-slate-600">
          Solicite, pague (stub) e aguarde um psicólogo online aceitar a fila.
        </p>
        {error && (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await createConsultationAction();
              if (r && !r.ok) setError(r.error);
              else router.refresh();
            })
          }
        >
          Pedir consulta
        </button>

        {recent.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 py-2">
                <span>
                  <code className="rounded bg-slate-100 px-1">
                    {r.id.slice(0, 8)}
                  </code>{" "}
                  · {r.status}
                  {!r.paid ? " · aguardando pagamento" : ""}
                </span>
                {r.status === "pending" && r.paid && (
                  <Link
                    href={`/standby/${r.id}`}
                    className="text-teal-700 underline"
                  >
                    Standby
                  </Link>
                )}
                {(r.status === "accepted" || r.status === "in_call") && (
                  <Link
                    href={`/call/${r.id}`}
                    className="text-teal-700 underline"
                  >
                    Ir para chamada
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm text-slate-500">
          Problemas?{" "}
          <Link href="/sac" className="text-teal-700 underline">
            Abrir SAC
          </Link>
        </p>
        <StubNote>
          Payout ao psicólogo só após completed — não no pedido.
        </StubNote>
      </Card>
    </>
  );
}
