import Link from "next/link";
import { Shell, Card, Field, Btn, StubNote } from "@/components/ui";

export default function ClientRegisterPage() {
  return (
    <Shell title="Criar conta (cliente identificado)" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Conta com créditos. Sessão: R$50 / 30 min → R$40 ao psicólogo após
          concluir.
        </p>
        <form className="max-w-md">
          <Field label="Nome" name="fullName" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Btn type="submit">Criar conta</Btn>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/client/login" className="text-teal-700 underline">
            Entrar
          </Link>
        </p>
        <StubNote>Stub de registro + credits_ledger na próxima fase.</StubNote>
      </Card>
    </Shell>
  );
}
