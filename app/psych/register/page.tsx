export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Shell, Card, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { psychRegisterAction } from "@/lib/actions/psych";

export default function PsychRegisterPage() {
  return (
    <Shell title="Cadastro de psicólogo" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Após o cadastro: fique <strong>online</strong> e aceite a fila
          pendente. Mensalidade (opcional no demo) libera e-mail de novas
          solicitações — não é atendimento só por e-mail.
        </p>
        <ActionForm action={psychRegisterAction} submitLabel="Registrar">
          <Field label="Nome completo" name="fullName" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Field label="CRP" name="crp" placeholder="CRP/XX 00000" required />
          <Field
            label="WhatsApp"
            name="whatsapp"
            placeholder="11999999999 ou +5511999999999"
            required
          />
          <Field
            label="Chave Pix"
            name="pixKey"
            placeholder="para payout após sessão"
          />
        </ActionForm>
        <p className="mt-4 text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/psych/login" className="text-teal-700 underline">
            Entrar
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
