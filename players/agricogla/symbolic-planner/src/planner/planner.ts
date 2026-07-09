// The planner: a rollout-based, model-driven move selector. For each promising
// candidate placement it (1) applies the move with the real engine, then (2)
// plays the game out to round 14 with the heuristic baseline driving every seat
// — a deterministic forward model of the whole rest of the game, harvests,
// feeding and begging included — and (3) scores the terminal margin. Picking the
// argmax is one-step policy improvement over the baseline: deviate once here,
// assume baseline play afterward, keep whatever deviation ends furthest ahead.
// Ties break toward denying the opponent a space they want. The engine reducers
// clone their input, so the whole search never touches the live state.

import {
  applyFeeding,
  applyPlacement,
  computeAutoFeed,
  type GameState,
  type Placement,
} from "../engine/index.js";
import { buildView, enumerateCandidates, fallbackPlacement, type SeamView } from "../baseline.js";
import { buildBeliefs, determinize, type WorldBelief } from "./beliefs.js";
import { assessContention, evaluateState } from "./tools.js";

export interface ScoredPlacement {
  placement: Placement;
  label: string;
  /** Terminal score margin reached by playing this move out under baseline. */
  value: number;
  /** True when this move occupies a space an opponent wanted. */
  denies: boolean;
}

export interface PlanResult {
  placement: Placement;
  belief: WorldBelief;
  best: ScoredPlacement;
  /** Top alternatives (already ranked), kept for decision attribution. */
  alternatives: ScoredPlacement[];
  candidateCount: number;
}

/** How many of the baseline's top-ranked candidates to roll out. The baseline
 *  already sorts by a sound heuristic, so a wide-enough prefix keeps the search
 *  cheap without dropping the move a full rollout would prefer. */
const ROLLOUT_WIDTH = 10;
const TOP_ALTERNATIVES = 4;

/** Play `state` to the end of the game with the baseline driving every seat. */
function rolloutToEnd(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (s.phase !== "finished" && guard++ < 4000) {
    if (s.phase === "feeding") {
      const actor = s.toFeed[0]!;
      s = applyFeeding(s, actor, computeAutoFeed(s, actor)).state;
    } else {
      const actor = s.currentPlayer;
      s = applyPlacement(s, actor, fallbackPlacement(buildView(s, actor))).state;
    }
  }
  return s;
}

/** Choose a placement for the seat to move by rolling each candidate to the end. */
export function planMove(view: SeamView): PlanResult {
  const { state, playerIdx: seat } = view;
  const belief = buildBeliefs(state, seat);
  // The seat cannot see the undealt deck or opponents' hands, so every forward
  // simulation runs against a single determinized belief of the hidden state.
  // Candidates are still enumerated from the seat's real (observable) view.
  const world = determinize(state, seat);
  const wanted = assessContention(world, seat).wantedActions;

  const candidates = enumerateCandidates(view);
  const seeds =
    candidates.length > 0
      ? candidates.slice(0, ROLLOUT_WIDTH).map((c) => ({ placement: c.placement, label: c.label }))
      : [{ placement: fallbackPlacement(view), label: "fallback" }];

  const scored: ScoredPlacement[] = seeds.map(({ placement, label }) => {
    const terminal = rolloutToEnd(applyPlacement(world, seat, placement).state);
    return { placement, label, value: evaluateState(terminal, seat), denies: wanted.has(placement.action) };
  });

  // Argmax terminal margin; ties go to opponent denial, then keep the baseline
  // order (Array.sort is stable) so the policy stays fully deterministic.
  scored.sort((a, b) => {
    const d = b.value - a.value;
    if (Math.abs(d) > 1e-9) return d;
    if (a.denies !== b.denies) return a.denies ? -1 : 1;
    return 0;
  });

  const best = scored[0]!;
  return {
    placement: best.placement,
    belief,
    best,
    alternatives: scored.slice(0, TOP_ALTERNATIVES),
    candidateCount: candidates.length,
  };
}
