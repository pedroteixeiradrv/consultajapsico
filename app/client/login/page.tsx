export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Shell, Card, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { clientLoginAction } from "@/lib/actions/client";

export default function ClientLoginPage() {
  return (
    <Shell title="Login cliente" backHref="/">
      <Card>
        <ActionForm action={clientLoginAction} submitLabel="Entrar">
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
        </ActionForm>
        <p className="mt-4 text-sm text-slate-500">
          Novo?{" "}
          <Link href="/client/register" className="text-teal-700 underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
