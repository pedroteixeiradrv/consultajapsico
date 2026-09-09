import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const db = await readStore();
  const req = db.consultation_requests.find((r) => r.id === params.requestId);
  if (!req) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const allowed =
    (session.role === "client" && req.client_id === session.sub) ||
    (session.role === "psych" &&
      (req.psychologist_id === session.sub || req.status === "pending")) ||
    session.role === "admin";
  if (!allowed) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  return NextResponse.json({
    id: req.id,
    status: req.status,
    paid: Boolean(req.paid_at),
    psychologist_id: req.psychologist_id,
  });
}
