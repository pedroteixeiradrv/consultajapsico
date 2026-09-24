export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shell, Card, Field, formatBRL } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { clientRegisterAction } from "@/lib/actions/client";
import { readStore } from "@/lib/store";

export default async function ClientRegisterPage() {
  const db = await readStore();
  const price = formatBRL(db.platform_settings.price_id_cents);
  const minutes = db.platform_settings.session_duration_minutes;

  return (
    <Shell title="Criar conta (cliente identificado)" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Conta identificada. Sessão de {minutes} minutos por {price}. Sem fluxo
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
