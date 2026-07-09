// The planner's decision tools: a terminal value function over a *world state*
// (`evaluateState`) and an opponent-intent model (`assessContention`). The
// planner simulates each candidate move to the end of the game and ranks the
// resulting terminal states with these tools — modeling consequences instead of
// scoring the raw option list the way the heuristic baseline does.

import { scoreGame, type GameState } from "../engine/index.js";
import { buildView, enumerateCandidates } from "../baseline.js";

/** Value a world state from a seat's perspective as its adversarial score margin
 *  (own victory points − the best opponent's). Evaluated on the *terminal* state
 *  a rollout reaches, this is exactly the game's objective: end ahead. */
export function evaluateState(state: GameState, seat: number): number {
  const sheets = scoreGame(state);
  const mine = sheets.find((s) => s.playerIdx === seat)!.total;
  let bestOpp = 0;
  for (const s of sheets) if (s.playerIdx !== seat) bestOpp = Math.max(bestOpp, s.total);
  return mine - bestOpp;
}

/** Opponent-intent model: the action spaces the opponents would most want to
 *  take right now (their top heuristic candidates). The planner uses this as a
 *  deterministic tie-break — when two of our plans reach equal terminal margins,
 *  prefer the one that denies an opponent a space they covet. */
export interface ContentionReport {
  wantedActions: Set<string>;
}

export function assessContention(state: GameState, seat: number): ContentionReport {
  const wantedActions = new Set<string>();
  for (const opp of state.players) {
    if (opp.idx === seat) continue;
    for (const c of enumerateCandidates(buildView(state, opp.idx)).slice(0, 2)) {
      wantedActions.add(c.placement.action);
    }
  }
  return { wantedActions };
}
