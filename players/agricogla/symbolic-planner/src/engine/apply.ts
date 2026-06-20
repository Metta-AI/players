import { HARVEST_ROUNDS, spaceDef } from "./boards";
import { cardById } from "./cards";
import { CardDef } from "./cards/types";
import {
  bestCookRate,
  canAccommodate,
  emit,
  gainGoods,
  hookCtx,
  playedCards,
  takeAnimals,
} from "./effects";
import { computePastures, neighborsOf, validateFencePlan } from "./farmyard";
import {
  BakeChoice,
  FeedDecision,
  ImprovementChoice,
  Placement,
  SowChoice,
} from "./placements";
import {
  ANIMALS,
  AnimalType,
  GameState,
  Goods,
  HouseMaterial,
  PlayerState,
  Resource,
  goodsToText,
} from "./types";
import { scoreGame } from "./scoring";

export class RuleError extends Error {}

function req(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RuleError(message);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function findSpace(state: GameState, id: string) {
  const space = state.actionSpaces.find((s) => s.id === id);
  req(space, `action space ${id} is not in play`);
  return space;
}

function canPay(player: PlayerState, cost: Partial<Record<Resource, number>>): boolean {
  return Object.entries(cost).every(([res, n]) => player.resources[res as Resource] >= (n ?? 0));
}

function pay(player: PlayerState, cost: Partial<Record<Resource, number>>): void {
  req(canPay(player, cost), `cannot afford ${goodsToText(cost)}`);
  for (const [res, n] of Object.entries(cost)) {
    player.resources[res as Resource] -= n ?? 0;
  }
}

export function roomCost(player: PlayerState): Partial<Record<Resource, number>> {
  const base: Goods = { [player.houseMaterial]: 5, reed: 2 };
  for (const card of playedCards(player)) {
    if (!card.roomDiscount) continue;
    const discount = card.roomDiscount(player.houseMaterial);
    for (const [res, n] of Object.entries(discount)) {
      const key = res as Resource;
      base[key] = Math.max(0, (base[key] ?? 0) - (n ?? 0));
    }
  }
  return base as Partial<Record<Resource, number>>;
}

export function renovationCost(player: PlayerState): Partial<Record<Resource, number>> {
  req(player.houseMaterial !== "stone", "house is already stone");
  const next: HouseMaterial = player.houseMaterial === "wood" ? "clay" : "stone";
  const rooms = player.spaces.filter((s) => s.kind === "room").length;
  return { [next]: rooms, reed: 1 };
}

export function legalRoomSpaces(player: PlayerState): number[] {
  const { pastureCells } = computePastures(player.spaces, player.fences);
  return player.spaces
    .map((_, i) => i)
    .filter((i) => {
      const sp = player.spaces[i]!;
      if (sp.kind !== "empty" || sp.stable || pastureCells.has(i)) return false;
      return neighborsOf(i).some((n) => player.spaces[n]!.kind === "room");
    });
}

export function legalFieldSpaces(player: PlayerState): number[] {
  const { pastureCells } = computePastures(player.spaces, player.fences);
  const hasFields = player.spaces.some((s) => s.kind === "field");
  return player.spaces
    .map((_, i) => i)
    .filter((i) => {
      const sp = player.spaces[i]!;
      if (sp.kind !== "empty" || sp.stable || pastureCells.has(i)) return false;
      if (!hasFields) return true;
      return neighborsOf(i).some((n) => player.spaces[n]!.kind === "field");
    });
}

export function legalStableSpaces(player: PlayerState): number[] {
  return player.spaces
    .map((_, i) => i)
    .filter((i) => {
      const sp = player.spaces[i]!;
      return sp.kind === "empty" && !sp.stable;
    });
}

function buildRooms(state: GameState, player: PlayerState, rooms: number[]): void {
  for (const space of rooms) {
    const legal = legalRoomSpaces(player);
    req(legal.includes(space), `cannot build a room at space ${space}`);
    pay(player, roomCost(player));
    player.spaces[space]!.kind = "room";
  }
  if (rooms.length > 0) {
    emit(state, player.idx, "build", `${player.name} builds ${rooms.length} room(s)`);
  }
}

function buildStables(state: GameState, player: PlayerState, stables: number[]): void {
  for (const space of stables) {
    const built = player.spaces.filter((s) => s.stable).length;
    req(built < 4, "maximum 4 stables");
    req(legalStableSpaces(player).includes(space), `cannot build a stable at space ${space}`);
    pay(player, { wood: 2 });
    player.spaces[space]!.stable = true;
  }
  if (stables.length > 0) {
    emit(state, player.idx, "build", `${player.name} builds ${stables.length} stable(s)`);
  }
}

function plowFields(
  state: GameState,
  player: PlayerState,
  spaces: number[],
  plowCard?: string,
): void {
  let allowed = 1;
  if (plowCard) {
    const card = cardById(plowCard);
    req(
      player.occupations.includes(plowCard) || player.minors.includes(plowCard),
      `${card.name} is not in play`,
    );
    req(card.plowExtra, `${card.name} is not a plow`);
    const data = (player.cardData[plowCard] ??= {});
    const used = data.plowUses ?? 0;
    req(used < card.plowExtra.uses, `${card.name} has no uses left`);
    data.plowUses = used + 1;
    allowed += card.plowExtra.fields;
  }
  req(spaces.length >= 1 && spaces.length <= allowed, `may plow up to ${allowed} field(s)`);
  for (const space of spaces) {
    req(legalFieldSpaces(player).includes(space), `cannot plow at space ${space}`);
    player.spaces[space]!.kind = "field";
  }
  emit(state, player.idx, "plow", `${player.name} plows ${spaces.length} field(s)`);
}

function sow(state: GameState, player: PlayerState, choices: SowChoice[]): void {
  const seen = new Set<number>();
  for (const { space, crop } of choices) {
    req(!seen.has(space), `sowing space ${space} twice`);
    seen.add(space);
    const sp = player.spaces[space];
    req(sp && sp.kind === "field", `space ${space} is not a field`);
    req(sp.cropCount === 0, `field ${space} is already sown`);
    req(player.resources[crop] >= 1, `no ${crop} to sow`);
    player.resources[crop] -= 1;
    sp.crop = crop;
    sp.cropCount = crop === "grain" ? 3 : 2;
  }
  if (choices.length > 0) {
    emit(state, player.idx, "sow", `${player.name} sows ${choices.length} field(s)`);
  }
}

function bake(state: GameState, player: PlayerState, choices: BakeChoice[]): void {
  const used = new Set<string>();
  for (const { card: cardId, grain } of choices) {
    req(!used.has(cardId), `baking twice with the same improvement`);
    used.add(cardId);
    const card = cardById(cardId);
    const owned =
      player.majors.includes(cardId) ||
      player.minors.includes(cardId) ||
      player.occupations.includes(cardId);
    req(owned, `${card.name} is not in play`);
    req(card.bake, `${card.name} cannot bake bread`);
    req(grain <= card.bake.maxGrain, `${card.name} bakes at most ${card.bake.maxGrain} grain`);
    req(player.resources.grain >= grain, "not enough grain");
    player.resources.grain -= grain;
    const food = grain * card.bake.perGrain;
    player.resources.food += food;
    emit(
      state,
      player.idx,
      "bake",
      `${player.name} bakes ${grain} grain into ${food} food (${card.name})`,
    );
  }
}

function renovate(state: GameState, player: PlayerState): void {
  const cost = renovationCost(player);
  pay(player, cost);
  player.houseMaterial = player.houseMaterial === "wood" ? "clay" : "stone";
  emit(state, player.idx, "renovate", `${player.name} renovates to a ${player.houseMaterial} home`);
}

function buildFences(state: GameState, player: PlayerState, edges: string[]): void {
  const result = validateFencePlan(player, edges);
  req(result.ok, result.error ?? "illegal fence plan");
  let free = 0;
  for (const card of playedCards(player)) free += card.freeFences ?? 0;
  const woodCost = Math.max(0, edges.length - free);
  pay(player, { wood: woodCost });
  player.fences.push(...edges);
  player.fencesBuilt += edges.length;
  emit(
    state,
    player.idx,
    "fences",
    `${player.name} builds ${edges.length} fence(s) (${result.layout!.pastures.length} pasture(s))`,
  );
}

function familyGrowth(state: GameState, player: PlayerState, needRoom: boolean): void {
  req(player.family.length < 5, "family is already 5");
  if (needRoom) {
    const rooms = player.spaces.filter((s) => s.kind === "room").length;
    req(rooms > player.family.length, "no free room for family growth");
  }
  player.family.push({ bornRound: state.round, placed: true });
  emit(state, player.idx, "family", `${player.name}'s family grows to ${player.family.length}`);
}

function occupationCost(state: GameState, player: PlayerState, spaceId: string): number {
  const played = player.occupations.length;
  if (spaceId === "lessons") return played === 0 ? 0 : 1;
  // lessons_b: 3-player board charges 2 food; 4-player board charges 1 food
  // for the player's first two occupations, then 2.
  if (state.numPlayers === 3) return 2;
  return played < 2 ? 1 : 2;
}

function playOccupation(state: GameState, player: PlayerState, cardId: string, food: number) {
  const idx = player.handOccupations.indexOf(cardId);
  req(idx >= 0, `occupation ${cardId} is not in hand`);
  const card = cardById(cardId);
  checkPrereq(state, player, card);
  pay(player, { food });
  player.handOccupations.splice(idx, 1);
  player.occupations.push(cardId);
  emit(state, player.idx, "occupation", `${player.name} plays occupation: ${card.name}`);
  card.onPlay?.(hookCtx(state, player));
}

function checkPrereq(state: GameState, player: PlayerState, card: CardDef): void {
  if (!card.prereq) return;
  if (card.prereq.occupations !== undefined) {
    req(
      player.occupations.length >= card.prereq.occupations,
      `${card.name} requires ${card.prereq.occupations} occupation(s): ${card.prereq.label}`,
    );
  }
  if (card.prereq.check) {
    req(card.prereq.check(player, state), `prerequisite not met: ${card.prereq.label}`);
  }
}

function playMinor(state: GameState, player: PlayerState, choice: ImprovementChoice): void {
  const idx = player.handMinors.indexOf(choice.card);
  req(idx >= 0, `minor improvement ${choice.card} is not in hand`);
  const card = cardById(choice.card);
  req(card.kind === "minor", `${card.name} is not a minor improvement`);
  checkPrereq(state, player, card);
  pay(player, card.cost ?? {});
  player.handMinors.splice(idx, 1);
  player.minors.push(choice.card);
  emit(state, player.idx, "improvement", `${player.name} plays improvement: ${card.name}`);
  card.onPlay?.(hookCtx(state, player));
  if (card.passing) {
    // Traveling card: hand it to the left-hand neighbor after use.
    const neighbor = state.players[(player.idx + 1) % state.numPlayers]!;
    if (neighbor.idx !== player.idx) {
      player.minors.splice(player.minors.indexOf(choice.card), 1);
      neighbor.handMinors.push(choice.card);
      emit(state, player.idx, "pass", `${card.name} passes to ${neighbor.name}`);
    }
  }
}

function buyMajor(state: GameState, player: PlayerState, choice: ImprovementChoice): void {
  const idx = state.majorsAvailable.indexOf(choice.card);
  req(idx >= 0, `major improvement ${choice.card} is not available`);
  const card = cardById(choice.card);
  if (choice.returnFireplace) {
    req(
      choice.card === "hearth4" || choice.card === "hearth5",
      "only a Cooking Hearth can be bought by returning a Fireplace",
    );
    const fpIdx = player.majors.indexOf(choice.returnFireplace);
    req(
      fpIdx >= 0 && (choice.returnFireplace === "fireplace2" || choice.returnFireplace === "fireplace3"),
      "no Fireplace to return",
    );
    player.majors.splice(fpIdx, 1);
    state.majorsAvailable.push(choice.returnFireplace);
  } else {
    pay(player, card.cost ?? {});
  }
  state.majorsAvailable.splice(state.majorsAvailable.indexOf(choice.card), 1);
  player.majors.push(choice.card);
  emit(state, player.idx, "improvement", `${player.name} buys ${card.name}`);
  card.onPlay?.(hookCtx(state, player));
  // Ovens allow an immediate bake on purchase.
  if (choice.bake && choice.bake.length > 0) {
    req(card.bake, `${card.name} cannot bake`);
    req(
      choice.bake.every((b) => b.card === choice.card),
      "immediate bake must use the bought oven",
    );
    bake(state, player, choice.bake);
  }
}

function playImprovement(
  state: GameState,
  player: PlayerState,
  choice: ImprovementChoice,
  allow: "minor" | "both",
): void {
  if (choice.kind === "major") {
    req(allow === "both", "only a minor improvement may be played here");
    buyMajor(state, player, choice);
  } else {
    playMinor(state, player, choice);
  }
}

/** Take everything from an accumulation space plus printed fixed goods. */
function takeSpaceGoods(state: GameState, player: PlayerState, spaceId: string): void {
  const space = findSpace(state, spaceId);
  const def = spaceDef(spaceId, state.numPlayers);
  const goods: Goods = { ...space.pile };
  for (const [g, n] of Object.entries(def.fixedGoods ?? {})) {
    goods[g as keyof Goods] = (goods[g as keyof Goods] ?? 0) + (n ?? 0);
  }
  space.pile = {};
  emit(state, player.idx, "take", `${player.name} takes ${goodsToText(goods)} (${def.title})`);
  gainGoods(state, player, spaceId, goods);
}

/** Resolve a placement for the current player. Throws RuleError when illegal. */
function resolvePlacement(state: GameState, player: PlayerState, placement: Placement): void {
  switch (placement.action) {
    case "farm_expansion": {
      req(
        placement.rooms.length + placement.stables.length > 0,
        "must build at least one room or stable",
      );
      buildRooms(state, player, placement.rooms);
      buildStables(state, player, placement.stables);
      break;
    }
    case "meeting_place": {
      state.startingPlayer = player.idx;
      for (const p of state.players) p.startingPlayerMarker = p.idx === player.idx;
      emit(state, player.idx, "starting", `${player.name} takes the starting player marker`);
      if (placement.improvement) {
        req(placement.improvement.kind === "minor", "Meeting Place allows a minor improvement");
        playMinor(state, player, placement.improvement);
      }
      break;
    }
    case "farmland": {
      plowFields(state, player, placement.spaces, placement.plowCard);
      break;
    }
    case "lessons":
    case "lessons_b": {
      const food = occupationCost(state, player, placement.action);
      playOccupation(state, player, placement.occupation, food);
      break;
    }
    case "grain_seeds":
    case "day_laborer":
    case "forest":
    case "clay_pit":
    case "reed_bank":
    case "fishing":
    case "copse":
    case "grove":
    case "hollow":
    case "quarry_stall":
    case "resource_market":
    case "traveling_players":
    case "r_sheep":
    case "r_west_quarry":
    case "r_vegetable":
    case "r_boar":
    case "r_east_quarry":
    case "r_cattle": {
      takeSpaceGoods(state, player, placement.action);
      break;
    }
    case "r_improvement": {
      playImprovement(state, player, placement.improvement, "both");
      break;
    }
    case "r_fences": {
      buildFences(state, player, placement.edges);
      break;
    }
    case "r_sow_bake": {
      req(placement.sow.length + placement.bake.length > 0, "must sow and/or bake");
      sow(state, player, placement.sow);
      bake(state, player, placement.bake);
      break;
    }
    case "r_renovate_improve": {
      renovate(state, player);
      if (placement.improvement) playImprovement(state, player, placement.improvement, "both");
      break;
    }
    case "r_family_growth": {
      familyGrowth(state, player, true);
      if (placement.improvement) {
        req(placement.improvement.kind === "minor", "only a minor improvement after family growth");
        playMinor(state, player, placement.improvement);
      }
      break;
    }
    case "r_urgent_family": {
      familyGrowth(state, player, false);
      break;
    }
    case "r_cultivation": {
      req(placement.plow !== undefined || placement.sow.length > 0, "must plow and/or sow");
      if (placement.plow !== undefined) plowFields(state, player, [placement.plow]);
      sow(state, player, placement.sow);
      break;
    }
    case "r_redevelop": {
      renovate(state, player);
      if (placement.edges.length > 0) buildFences(state, player, placement.edges);
      break;
    }
  }
}

export interface StepResult {
  state: GameState;
}

/** Place the next family member of `playerIdx` on an action space. */
export function applyPlacement(
  state: GameState,
  playerIdx: number,
  placement: Placement,
): StepResult {
  req(state.phase === "work", `not in the work phase`);
  req(state.currentPlayer === playerIdx, `not player ${playerIdx}'s turn`);
  const next = clone(state);
  const player = next.players[playerIdx]!;
  const member = player.family.find((m) => !m.placed);
  req(member, "no family members left to place");

  const space = findSpace(next, placement.action);
  req(space.occupiedBy === null, `${placement.action} is already occupied`);

  resolvePlacement(next, player, placement);

  space.occupiedBy = playerIdx;
  member.placed = true;
  const ctx = hookCtx(next, player);
  for (const card of playedCards(player)) card.onAction?.(ctx, placement.action);

  advanceWork(next);
  return { state: next };
}

function advanceWork(state: GameState): void {
  const n = state.numPlayers;
  for (let i = 1; i <= n; i++) {
    const idx = (state.currentPlayer + i) % n;
    if (state.players[idx]!.family.some((m) => !m.placed)) {
      state.currentPlayer = idx;
      return;
    }
  }
  // Work phase over: return home.
  for (const p of state.players) for (const m of p.family) m.placed = false;
  emit(state, null, "phase", `Round ${state.round}: everyone returns home`);
  if (HARVEST_ROUNDS.has(state.round)) {
    startHarvest(state);
  } else {
    startRound(state);
  }
}

function startHarvest(state: GameState): void {
  emit(state, null, "harvest", `Harvest after round ${state.round}`);
  for (const player of state.players) {
    let grain = 0;
    let veg = 0;
    for (const sp of player.spaces) {
      if (sp.kind === "field" && sp.crop && sp.cropCount > 0) {
        sp.cropCount -= 1;
        if (sp.crop === "grain") grain += 1;
        else veg += 1;
        if (sp.cropCount === 0) sp.crop = null;
      }
    }
    player.resources.grain += grain;
    player.resources.vegetable += veg;
    if (grain + veg > 0) {
      emit(
        state,
        player.idx,
        "field",
        `${player.name} harvests ${grain} grain and ${veg} vegetable(s)`,
      );
    }
    const ctx = hookCtx(state, player);
    for (const card of playedCards(player)) card.onHarvest?.(ctx);
    // Reset per-harvest conversion trackers.
    for (const data of Object.values(player.cardData)) delete data.harvestUsed;
  }
  state.phase = "feeding";
  state.toFeed = state.players.map((p) => p.idx);
}

export function foodNeeded(state: GameState, player: PlayerState): number {
  const perAdult = state.solo ? 3 : 2;
  return player.family.reduce(
    (sum, m) => sum + (m.bornRound === state.round ? 1 : perAdult),
    0,
  );
}

/** Apply a feeding decision for one player during the feeding phase. */
export function applyFeeding(
  state: GameState,
  playerIdx: number,
  decision: FeedDecision,
): StepResult {
  req(state.phase === "feeding", "not in the feeding phase");
  req(state.toFeed.includes(playerIdx), `player ${playerIdx} has already fed`);
  const next = clone(state);
  const player = next.players[playerIdx]!;

  for (const conv of decision.conversions) {
    applyConversion(next, player, conv.via, conv.good, conv.count, true);
  }

  const needed = foodNeeded(next, player);
  const paid = Math.min(needed, player.resources.food);
  player.resources.food -= paid;
  const missing = needed - paid;
  if (missing > 0) {
    player.beggingCards += missing;
    emit(
      next,
      player.idx,
      "begging",
      `${player.name} is short ${missing} food and takes ${missing} begging card(s)`,
    );
  } else {
    emit(next, player.idx, "feed", `${player.name} feeds the family (${needed} food)`);
  }

  next.toFeed = next.toFeed.filter((i) => i !== playerIdx);
  if (next.toFeed.length === 0) {
    breed(next);
    startRound(next);
  }
  return { state: next };
}

export function applyConversion(
  state: GameState,
  player: PlayerState,
  via: string,
  good: string,
  count: number,
  feeding: boolean,
): void {
  req(count >= 1, "conversion count must be positive");
  if (via === "raw") {
    req(good === "grain" || good === "vegetable", "only crops convert at 1 food raw");
    req(player.resources[good] >= count, `not enough ${good}`);
    player.resources[good] -= count;
    player.resources.food += count;
    return;
  }
  const card = cardById(via);
  const owned =
    player.majors.includes(via) || player.minors.includes(via) || player.occupations.includes(via);
  req(owned, `${card.name} is not in play`);
  const cookRate = card.cook?.[good as AnimalType | "vegetable"];
  if (cookRate) {
    if (good === "vegetable") {
      req(player.resources.vegetable >= count, "not enough vegetables");
      player.resources.vegetable -= count;
    } else {
      const animal = good as AnimalType;
      req((ANIMALS as readonly string[]).includes(animal), `cannot cook ${good}`);
      req(player.animals[animal] >= count, `not enough ${animal}`);
      player.animals[animal] -= count;
    }
    player.resources.food += cookRate * count;
    emit(
      state,
      player.idx,
      "cook",
      `${player.name} converts ${count} ${good} into ${cookRate * count} food (${card.name})`,
    );
    return;
  }
  if (card.harvestFood && card.harvestFood.from === good) {
    req(feeding, `${card.name} converts only during a harvest`);
    const data = (player.cardData[via] ??= {});
    const used = data.harvestUsed ?? 0;
    req(used + count <= card.harvestFood.max, `${card.name}: at most ${card.harvestFood.max} per harvest`);
    req(player.resources[good as Resource] >= count, `not enough ${good}`);
    data.harvestUsed = used + count;
    player.resources[good as Resource] -= count;
    player.resources.food += card.harvestFood.food * count;
    emit(
      state,
      player.idx,
      "cook",
      `${player.name} converts ${count} ${good} into ${card.harvestFood.food * count} food (${card.name})`,
    );
    return;
  }
  throw new RuleError(`${card.name} cannot convert ${good}`);
}

/** Breeding: one offspring per type with >=2 animals, if it can be housed. */
function breed(state: GameState): void {
  for (const player of state.players) {
    const eligible = ANIMALS.filter((t) => player.animals[t] >= 2);
    if (eligible.length === 0) continue;
    // Choose the largest accommodatable subset of births; prefer valuable types.
    const priority: AnimalType[] = ["cattle", "boar", "sheep"];
    let bestSubset: AnimalType[] = [];
    const subsets = (list: AnimalType[]): AnimalType[][] =>
      list.reduce<AnimalType[][]>((acc, t) => [...acc, ...acc.map((s) => [...s, t])], [[]]);
    for (const subset of subsets(eligible)) {
      const counts = { ...player.animals };
      for (const t of subset) counts[t] += 1;
      if (!canAccommodate(player, counts)) continue;
      if (
        subset.length > bestSubset.length ||
        (subset.length === bestSubset.length &&
          priority.findIndex((t) => subset.includes(t)) <
            priority.findIndex((t) => bestSubset.includes(t)))
      ) {
        bestSubset = subset;
      }
    }
    for (const t of bestSubset) {
      player.animals[t] += 1;
      emit(state, player.idx, "breed", `${player.name}'s ${t} breed (+1)`);
    }
  }
}

/** Reveal next round card, deliver scheduled goods, replenish, begin work. */
export function startRound(state: GameState): void {
  if (state.round >= 14) {
    finishGame(state);
    return;
  }
  state.round += 1;
  state.phase = "work";
  for (const space of state.actionSpaces) space.occupiedBy = null;

  const revealed = state.roundDeck.shift();
  if (revealed) {
    state.actionSpaces.push({ id: revealed, occupiedBy: null, pile: {} });
    emit(
      state,
      null,
      "reveal",
      `Round ${state.round}: ${spaceDef(revealed, state.numPlayers).title} is now available`,
    );
  }

  // Scheduled goods (e.g. the Well) pay out as the round begins.
  for (const sched of state.scheduled.filter((s) => s.round === state.round)) {
    const player = state.players[sched.playerIdx]!;
    if (sched.good === "sheep" || sched.good === "boar" || sched.good === "cattle") {
      takeAnimals(state, player, { [sched.good]: sched.count });
    } else {
      player.resources[sched.good as Resource] += sched.count;
    }
    emit(
      state,
      sched.playerIdx,
      "scheduled",
      `${player.name} collects ${sched.count} ${sched.good}`,
    );
  }
  state.scheduled = state.scheduled.filter((s) => s.round !== state.round);

  // Round-start card hooks.
  for (const player of state.players) {
    const ctx = hookCtx(state, player);
    for (const card of playedCards(player)) card.onRoundStart?.(ctx, state.round);
  }

  // Replenish accumulation spaces.
  for (const space of state.actionSpaces) {
    const def = spaceDef(space.id, state.numPlayers);
    if (!def.accumulates) continue;
    for (const [g, n] of Object.entries(def.accumulates)) {
      space.pile[g as keyof Goods] = (space.pile[g as keyof Goods] ?? 0) + (n ?? 0);
    }
  }

  state.currentPlayer = state.startingPlayer;
}

function finishGame(state: GameState): void {
  state.phase = "finished";
  state.scores = scoreGame(state);
  const winner = state.scores.reduce((a, b) => (b.total > a.total ? b : a));
  emit(
    state,
    null,
    "end",
    `Game over. ${state.players[winner.playerIdx]!.name} wins with ${winner.total} points`,
  );
}

/** Auto-feed: cover the food need with the cheapest goods available. Used as
 *  agent fallback and by the UI's auto button. */
export function computeAutoFeed(state: GameState, playerIdx: number): FeedDecision {
  const player = clone(state.players[playerIdx]!);
  const needed = foodNeeded(state, player);
  let have = player.resources.food;
  const conversions: FeedDecision["conversions"] = [];
  const addConv = (via: string, good: string, count: number, foodEach: number) => {
    conversions.push({ via, good: good as FeedDecision["conversions"][number]["good"], count });
    have += foodEach * count;
  };

  // 1. Workshop harvest conversions (spare building resources).
  for (const cardId of [...player.majors, ...player.minors, ...player.occupations]) {
    if (have >= needed) break;
    const card = cardById(cardId);
    if (!card.harvestFood) continue;
    const res = card.harvestFood.from;
    const spare = Math.max(0, player.resources[res] - 2);
    const count = Math.min(card.harvestFood.max, spare, Math.ceil((needed - have) / card.harvestFood.food));
    if (count > 0) {
      player.resources[res] -= count;
      addConv(cardId, res, count, card.harvestFood.food);
    }
  }
  // 2. Raw grain.
  while (have < needed && player.resources.grain > 0) {
    player.resources.grain -= 1;
    addConv("raw", "grain", 1, 1);
  }
  // 3. Cook animals, keeping breeding pairs where possible: sheep, boar, cattle.
  for (const type of ["sheep", "boar", "cattle"] as const) {
    const cook = bestCookRate(player, type);
    if (!cook) continue;
    while (have < needed && player.animals[type] > 2) {
      player.animals[type] -= 1;
      addConv(cook.card.id, type, 1, cook.food);
    }
  }
  // 4. Raw vegetables.
  while (have < needed && player.resources.vegetable > 0) {
    player.resources.vegetable -= 1;
    addConv("raw", "vegetable", 1, 1);
  }
  // 5. Break up breeding pairs as a last resort.
  for (const type of ["sheep", "boar", "cattle"] as const) {
    const cook = bestCookRate(player, type);
    if (!cook) continue;
    while (have < needed && player.animals[type] > 0) {
      player.animals[type] -= 1;
      addConv(cook.card.id, type, 1, cook.food);
    }
  }
  return { conversions };
}
