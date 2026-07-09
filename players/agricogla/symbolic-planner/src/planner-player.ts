// Standalone agricogla symbolic-planner coworld player. In the work phase it
// runs the model-based `planMove` (belief model + determinized full-game rollout
// + world-state value); in feeding it uses the engine's canonical auto-feed.
// Every decision is logged as one structured JSON line to stdout (captured as the
// per-slot policy log) so the optimization loop can attribute behavior.
//
//   COWORLD_PLAYER_WS_URL=ws://… node dist/planner-player.js

import { argv } from "node:process";
import { fileURLToPath } from "node:url";

import { runCoworldPlayer, type PlayerDecideContext } from "./runtime/player-runtime.js";
import { computeAutoFeed, type GameState } from "./engine/index.js";
import { buildView } from "./baseline.js";
import { planMove } from "./planner/planner.js";

type AgriDecision = import("./engine/index.js").Placement | import("./engine/index.js").FeedDecision;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function decide(ctx: PlayerDecideContext<GameState>): AgriDecision {
  const state = ctx.view;
  const seat = ctx.seat;

  if (state.phase === "feeding") {
    const feed = computeAutoFeed(state, seat);
    console.log(
      JSON.stringify({
        kind: "planner_decision",
        phase: "feeding",
        seat,
        turn: ctx.turn,
        round: state.round,
        conversions: feed.conversions.length,
      }),
    );
    return feed;
  }

  const plan = planMove(buildView(state, seat));
  const b = plan.belief;
  console.log(
    JSON.stringify({
      kind: "planner_decision",
      phase: "work",
      seat,
      turn: ctx.turn,
      round: state.round,
      action: plan.placement.action,
      label: plan.best.label,
      value: r2(plan.best.value),
      margin: b.margin,
      foodDeficit: b.food.deficit,
      foodUrgency: b.food.urgency,
      growthHeadroom: b.self.growthHeadroom,
      candidates: plan.candidateCount,
      alternatives: plan.alternatives.map((a) => ({
        action: a.placement.action,
        value: r2(a.value),
        denies: a.denies,
      })),
    }),
  );
  return plan.placement;
}

export function run(): Promise<number[]> {
  return runCoworldPlayer<GameState, AgriDecision>({ decide });
}

// Run only when invoked as the entrypoint, not when imported (e.g. by tests).
if (argv[1] === fileURLToPath(import.meta.url)) {
  await run();
}
