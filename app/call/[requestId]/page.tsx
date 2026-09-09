import { Shell, Card, StubNote } from "@/components/ui";

export default function CallPage({
  params,
}: {
  params: { requestId: string };
}) {
  const { requestId } = params;

  return (
    <Shell title="Consulta em andamento" backHref={`/standby/${requestId}`}>
      <Card>
        <div className="mb-6 flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-center text-white">
          <div>
            <p className="text-lg font-semibold">Sala voz / vídeo</p>
            <p className="mt-1 text-sm text-slate-300">LiveKit depois</p>
            <p className="mt-3 text-xs text-slate-400">pedido {requestId}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Timer de 30 minutos. Ao concluir (completed), o psicólogo recebe o
          corte via Pix — nunca antes.
        </p>
        <StubNote>
          Stub LiveKit (<code>lib/livekit.ts</code>). Encerrar sessão →
          completed → <code>enqueuePsychPayout</code>.
        </StubNote>
      </Card>
    </Shell>
  );
}
