// The belief layer of the symbolic planner: a typed, seat-centric model of the
// world distilled from the redacted engine view. Everything the planner reasons
// about — food security, farm development, the adversarial score gap — is read
// off a `WorldBelief` rather than poked out of the raw `GameState` ad hoc, so
// every decision is attributable to a structured belief snapshot.

import {
  ANIMALS,
  HARVEST_ROUNDS,
  bestCookRate,
  computePastures,
  foodNeeded,
  roundCards,
  scoreGame,
  type GameState,
  type PlayerState,
} from "../engine/index.js";

/** Sentinel the coworld host writes over information a seat may not see. */
const HIDDEN = "hidden";
/** The full round-card catalogue in stage order (stage 1 first … stage 6 last).
 *  The deck is only ever shuffled *within* a stage, so the remaining cards in
 *  stage order are a legal — if not perfectly ordered — completion of the deck. */
const ROUND_CARD_IDS: readonly string[] = roundCards.map((c) => c.id);

/** Rounds from `round` (inclusive) to the next harvest; 0 = harvest at round end. */
export function nextHarvestIn(round: number): number {
  for (let r = round; r <= 14; r++) if (HARVEST_ROUNDS.has(r)) return r - round;
  return 14 - round;
}

/** The food model: what the family will owe at the next harvest vs. what we can
 *  muster by then (supply + raw crops + cookable animals + this-harvest field
 *  yield). A positive `deficit` means begging cards (−3 vp each). */
export interface FoodOutlook {
  need: number;
  projected: number;
  deficit: number;
  harvestGap: number;
  /** 0 comfortable … 4 starving with the harvest imminent. */
  urgency: number;
}

/** A single seat's farm, distilled to the quantities that drive scoring and the
 *  planner's forward value. Built for every seat so the planner can model
 *  opponents from their public board. */
export interface SeatBelief {
  idx: number;
  isSelf: boolean;
  food: number;
  grain: number;
  vegetable: number;
  wood: number;
  clay: number;
  reed: number;
  stone: number;
  sheep: number;
  boar: number;
  cattle: number;
  family: number;
  rooms: number;
  fields: number;
  pastures: number;
  stables: number;
  fencedStables: number;
  unusedSpaces: number;
  houseMaterial: PlayerState["houseMaterial"];
  occupations: number;
  minors: number;
  majors: number;
  beggingCards: number;
  /** rooms − family: free beds available for family growth. */
  growthHeadroom: number;
  /** animal types currently holding a breeding pair (≥2). */
  breedingPairs: number;
  /** live engine score for this seat. */
  score: number;
}

export interface GameClock {
  round: number;
  roundsRemaining: number;
  harvestGap: number;
  harvestsRemaining: number;
  isHarvestRound: boolean;
}

/** The planner's complete world model for one decision. */
export interface WorldBelief {
  self: SeatBelief;
  opponents: SeatBelief[];
  clock: GameClock;
  food: FoodOutlook;
  /** self.score − best opponent score: the adversarial signal we maximize. */
  margin: number;
}

/** Project a seat's food balance against the next harvest. */
export function projectFood(state: GameState, player: PlayerState): FoodOutlook {
  const harvestGap = nextHarvestIn(state.round);
  const res = player.resources;
  const cookable = ANIMALS.reduce(
    (s, t) => s + (bestCookRate(player, t)?.food ?? 0) * player.animals[t],
    0,
  );
  const fieldYield = player.spaces.filter(
    (sp) => sp.kind === "field" && sp.crop && sp.cropCount > 0,
  ).length;
  const projected = res.food + res.grain + res.vegetable + cookable + fieldYield;
  const need = foodNeeded(state, player);
  const deficit = need - projected;
  const urgency = deficit > 0 ? Math.max(1, 4 - harvestGap) : 0;
  return { need, projected, deficit, harvestGap, urgency };
}

function seatBelief(player: PlayerState, score: number, isSelf: boolean): SeatBelief {
  const layout = computePastures(player.spaces, player.fences);
  const r = player.resources;
  const rooms = player.spaces.filter((s) => s.kind === "room").length;
  return {
    idx: player.idx,
    isSelf,
    food: r.food,
    grain: r.grain,
    vegetable: r.vegetable,
    wood: r.wood,
    clay: r.clay,
    reed: r.reed,
    stone: r.stone,
    sheep: player.animals.sheep,
    boar: player.animals.boar,
    cattle: player.animals.cattle,
    family: player.family.length,
    rooms,
    fields: player.spaces.filter((s) => s.kind === "field").length,
    pastures: layout.pastures.length,
    stables: player.spaces.filter((s) => s.stable).length,
    fencedStables: player.spaces.filter((sp, i) => sp.stable && layout.pastureCells.has(i)).length,
    unusedSpaces: player.spaces.filter(
      (sp, i) => sp.kind === "empty" && !sp.stable && !layout.pastureCells.has(i),
    ).length,
    houseMaterial: player.houseMaterial,
    occupations: player.occupations.length,
    minors: player.minors.length,
    majors: player.majors.length,
    beggingCards: player.beggingCards,
    growthHeadroom: rooms - player.family.length,
    breedingPairs: ANIMALS.filter((t) => player.animals[t] >= 2).length,
    score,
  };
}

/** Build the seat's world model from an engine state. */
export function buildBeliefs(state: GameState, seat: number): WorldBelief {
  const sheets = scoreGame(state);
  const scoreOf = (idx: number) => sheets.find((s) => s.playerIdx === idx)!.total;
  const self = seatBelief(state.players[seat]!, scoreOf(seat), true);
  const opponents = state.players
    .filter((p) => p.idx !== seat)
    .map((p) => seatBelief(p, scoreOf(p.idx), false));
  const bestOpp = opponents.reduce((m, o) => Math.max(m, o.score), 0);
  return {
    self,
    opponents,
    clock: {
      round: state.round,
      roundsRemaining: 14 - state.round,
      harvestGap: nextHarvestIn(state.round),
      harvestsRemaining: [...HARVEST_ROUNDS].filter((r) => r >= state.round).length,
      isHarvestRound: HARVEST_ROUNDS.has(state.round),
    },
    food: projectFood(state, state.players[seat]!),
    margin: self.score - bestOpp,
  };
}

/** Determinize the hidden state into the one belief the planner can act on. A
 *  seat's coworld view redacts the undealt round deck and every other seat's
 *  hand to the `"hidden"` sentinel, so a forward simulation that touched them
 *  would crash. We fill those gaps with the only legal, information-free guess:
 *  the remaining round cards in stage order (a valid deck completion), and
 *  opponents holding no private cards (they still contest the public board).
 *  Each candidate is rolled out against this same belief, so the ranking is
 *  fair. On an unredacted state (self-play) nothing is masked, so it is a
 *  no-op and the real deck and hands drive the rollout. */
export function determinize(state: GameState, seat: number): GameState {
  const next = structuredClone(state);
  if (next.roundDeck.includes(HIDDEN)) {
    const revealed = new Set(next.actionSpaces.map((a) => a.id));
    const remaining = ROUND_CARD_IDS.filter((id) => !revealed.has(id));
    if (remaining.length !== next.roundDeck.length) {
      throw new Error(
        `deck belief mismatch: ${remaining.length} remaining cards vs ${next.roundDeck.length} undealt`,
      );
    }
    next.roundDeck = [...remaining];
  }
  for (const p of next.players) {
    if (p.idx === seat) continue;
    if (p.handOccupations.includes(HIDDEN)) p.handOccupations = [];
    if (p.handMinors.includes(HIDDEN)) p.handMinors = [];
  }
  return next;
}
