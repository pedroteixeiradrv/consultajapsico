export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Shell, Card, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { clientRegisterAction } from "@/lib/actions/client";

export default function ClientRegisterPage() {
  return (
    <Shell title="Criar conta (cliente identificado)" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Conta identificada. Sessão de meia hora por R$50. Sem fluxo
          anônimo.
        </p>
        <ActionForm action={clientRegisterAction} submitLabel="Criar conta">
          <Field label="Nome" name="fullName" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
        </ActionForm>
        <p className="mt-4 text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/client/login" className="text-teal-700 underline">
            Entrar
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
