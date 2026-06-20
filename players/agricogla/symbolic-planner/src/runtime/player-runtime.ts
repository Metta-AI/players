// Standalone coworld player runtime — a WebSocket CLIENT of the game host's
// /player endpoint. Receives observations, calls the injected `decide`, sends
// replies. Derived from @cogweb/coworld's player-runtime but dependency-free
// (no @cogweb/* imports).

import { WebSocket } from "ws";

export interface PlayerDecideContext<View> {
  view: View;
  seat: number;
  turn: number;
  reason: string | null;
}

export interface RunPlayerOpts<View, Decision> {
  connect?: string;
  decide: (ctx: PlayerDecideContext<View>) => Decision | Promise<Decision>;
}

export function runCoworldPlayer<View, Decision>(
  opts: RunPlayerOpts<View, Decision>,
): Promise<number[]> {
  const url = opts.connect ?? process.env.COWORLD_PLAYER_WS_URL;
  if (!url) throw new Error("no player socket URL: pass `connect` or set COWORLD_PLAYER_WS_URL");

  return new Promise<number[]>((resolve, reject) => {
    const ws = new WebSocket(url);

    ws.on("error", reject);
    ws.on("message", (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      switch (msg.type) {
        case "welcome":
          return;
        case "final":
          // Emit a zero-token Bedrock usage line (this is a no-LLM policy) so
          // the episode bundle can confirm no LLM calls were made.
          console.log(JSON.stringify({ kind: "bedrock_usage", inputTokens: 0, outputTokens: 0 }));
          resolve(msg.scores);
          ws.close();
          return;
        case "observation": {
          const ctx: PlayerDecideContext<View> = {
            view: msg.view as View,
            seat: msg.seat,
            turn: msg.turn,
            reason: msg.reason ?? null,
          };
          void Promise.resolve(opts.decide(ctx)).then((decision) => {
            const reply = { type: "reply", id: msg.id, decision, messages: [] };
            ws.send(JSON.stringify(reply));
          }, reject);
          return;
        }
      }
    });
  });
}
