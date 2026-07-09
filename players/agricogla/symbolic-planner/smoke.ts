// Local end-to-end smoke: play a full 4-player episode where seat 0 is piloted
// by the symbolic planner over REDACTED views (the exact path the host serves),
// and seats 1-3 by the engine baseline. Verifies the standalone fork plays all
// 14 rounds with no crash on hidden state. Run: npx tsx scratch-smoke.ts
import {
  newGame,
  applyPlacement,
  applyFeeding,
  computeAutoFeed,
  scoreGame,
  type GameState,
  type Placement,
  type FeedDecision,
} from "./src/engine/index.js";
import { buildView, fallbackPlacement } from "./src/baseline.js";
import { planMove } from "./src/planner/planner.js";

/** Mirror of the seam's game.redact: mask future deck + other seats' hands. */
function redact(s: GameState, seat: number): GameState {
  const next = structuredClone(s);
  next.seed = 0;
  next.roundDeck = next.roundDeck.map(() => "hidden");
  for (const p of next.players) {
    if (p.idx !== seat) {
      p.handOccupations = p.handOccupations.map(() => "hidden");
      p.handMinors = p.handMinors.map(() => "hidden");
    }
  }
  return next;
}

let state = newGame({ seed: 12345, numPlayers: 4, names: ["Planner", "B1", "B2", "B3"] });
let plannerDecisions = 0;
let guard = 0;

while (state.phase !== "finished") {
  guard++;
  if (guard > 5000) throw new Error("loop guard tripped — game did not finish");

  if (state.phase === "feeding") {
    const seat = state.toFeed[0]!;
    const feed: FeedDecision = computeAutoFeed(redact(state, seat), seat);
    state = applyFeeding(state, seat, feed).state;
    continue;
  }

  const seat = state.currentPlayer;
  const view = redact(state, seat);
  let placement: Placement;
  if (seat === 0) {
    placement = planMove(buildView(view, seat)).placement;
    plannerDecisions++;
  } else {
    placement = fallbackPlacement(buildView(view, seat));
  }
  state = applyPlacement(state, seat, placement).state;
}

const sheets = scoreGame(state);
const scores = sheets.map((s) => s.total);
console.log(JSON.stringify({ rounds: state.round, plannerDecisions, scores }, null, 2));
const plannerScore = sheets.find((s) => s.playerIdx === 0)!.total;
const maxOpp = Math.max(...sheets.filter((s) => s.playerIdx !== 0).map((s) => s.total));
console.log(`planner=${plannerScore} bestOpp=${maxOpp} margin=${plannerScore - maxOpp}`);
console.log(plannerScore >= maxOpp ? "PLANNER WINS/TIES" : "planner lost");
