/**
 * LiveKit stub — sala de voz/vídeo da consulta.
 * Token e room serão gerados após accept / in_call.
 */

export type LiveKitTokenInput = {
  requestId: string;
  identity: string;
  name?: string;
};

export async function createRoomToken(
  _input: LiveKitTokenInput
): Promise<{ token: string; roomName: string; url: string }> {
  // TODO: LiveKit com LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL
  console.info("[livekit stub] createRoomToken", _input);
  return {
    token: "stub-token",
    roomName: `consultaja-${_input.requestId}`,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "wss://stub.livekit.local",
  };
}
