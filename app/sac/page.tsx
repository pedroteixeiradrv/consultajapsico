import { Shell, Card, Field, Btn, StubNote } from "@/components/ui";

export default function SacPage() {
  return (
    <Shell title="SAC — suporte" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Formulário geral de solicitação. Somente a equipe admin lê os
          tickets. Use este canal para dúvidas, suporte ou reembolso com
          comprovante (não há reembolso automático).
        </p>
        <form className="max-w-md">
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
          <Btn type="submit">Enviar</Btn>
        </form>
        <StubNote>
          Grava em sac_tickets. Listagem apenas em /admin/sac.
        </StubNote>
      </Card>
    </Shell>
  );
}
