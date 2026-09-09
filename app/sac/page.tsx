export const dynamic = 'force-dynamic';

import { Shell, Card, Field, SuccessBox } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { submitSacAction } from "@/lib/actions/sac";

export default function SacPage({
  searchParams,
}: {
  searchParams: { sent?: string };
}) {
  return (
    <Shell title="SAC — suporte" backHref="/">
      <Card>
        <SuccessBox
          message={
            searchParams.sent
              ? "Ticket enviado. Somente a equipe admin lê."
              : null
          }
        />
        <p className="mb-4 text-sm text-slate-600">
          Formulário geral de solicitação. Somente a equipe admin lê os
          tickets. Use este canal para dúvidas, suporte ou reembolso com
          comprovante (não há reembolso automático).
        </p>
        <ActionForm action={submitSacAction} submitLabel="Enviar">
          <Field label="E-mail (opcional)" name="email" type="email" />
          <Field label="Assunto" name="subject" required />
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Mensagem
            </span>
            <textarea
              name="body"
              required
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <Field
            label="Comprovante / referência (reembolso)"
            name="proofNote"
            placeholder="ID do pagamento, print, etc."
          />
        </ActionForm>
      </Card>
    </Shell>
  );
}
