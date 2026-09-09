import Link from "next/link";
import { Shell, Card, Field, Btn, StubNote } from "@/components/ui";

export default function PsychRegisterPage() {
  return (
    <Shell title="Cadastro de psicólogo" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Após o cadastro: pagar mensalidade (LivePix depois), ficar{" "}
          <strong>online</strong> e aceitar a fila pendente — não é atendimento
          só por e-mail.
        </p>
        <form className="max-w-md">
          <Field label="Nome completo" name="fullName" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Field label="CRP (opcional)" name="crp" placeholder="CRP/XX 00000" />
          <Field label="Chave Pix" name="pixKey" placeholder="para payout após sessão" />
          <Btn type="submit">Registrar</Btn>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/psych/login" className="text-teal-700 underline">
            Entrar
          </Link>
        </p>
        <StubNote>
          Stub: subscription_status=pending até pagamento LivePix da mensalidade.
        </StubNote>
      </Card>
    </Shell>
  );
}
