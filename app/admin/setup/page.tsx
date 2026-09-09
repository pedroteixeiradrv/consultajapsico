import { Shell, Card, Field, Btn, StubNote } from "@/components/ui";

export default function AdminSetupPage() {
  return (
    <Shell title="Criar administrador" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          O primeiro acesso cria o usuário admin e a senha. Um segundo cadastro
          de admin deve retornar erro.
        </p>
        <form className="max-w-md">
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Field
            label="Confirmar senha"
            name="passwordConfirm"
            type="password"
            required
          />
          <Btn type="submit">Criar admin</Btn>
        </form>
        <StubNote>
          Stub: persistência em Supabase + hash de senha na próxima fase. A
          constraint SQL e a app garantem no máximo 1 admin.
        </StubNote>
      </Card>
    </Shell>
  );
}
