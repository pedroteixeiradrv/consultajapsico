import { logoutAction } from "@/lib/actions/admin";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        Sair
      </button>
    </form>
  );
}
