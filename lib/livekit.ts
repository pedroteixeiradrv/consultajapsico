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
  input: LiveKitTokenInput
): Promise<{ token: string; roomName: string; url: string }> {
  console.info("[livekit stub] createRoomToken", input);
  return {
    token: "stub-token",
    roomName: `consultaja-${input.requestId}`,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "wss://stub.livekit.local",
  };
}
