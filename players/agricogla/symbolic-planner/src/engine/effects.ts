import { cardById } from "./cards";
import { CardDef, HookCtx } from "./cards/types";
import { CapacitySlot, maxRetention } from "./farmyard";
import { AnimalType, ANIMALS, GameState, GameEvent, Goods, PlayerState } from "./types";

export function emit(
  state: GameState,
  playerIdx: number | null,
  type: string,
  text: string,
): GameEvent {
  const ev: GameEvent = { round: state.round, playerIdx, type, text };
  state.log.push(ev);
  return ev;
}

export function hookCtx(state: GameState, player: PlayerState): HookCtx {
  return {
    state,
    player,
    emit: (type, text) => void emit(state, player.idx, type, text),
  };
}

/** All cards in front of the player (occupations, minors, majors). */
export function playedCards(player: PlayerState): CardDef[] {
  return [...player.occupations, ...player.minors, ...player.majors].map(cardById);
}

export function capacitySlots(player: PlayerState): CapacitySlot[] {
  const out: CapacitySlot[] = [];
  for (const card of playedCards(player)) {
    if (card.capacity) out.push(...card.capacity(player));
  }
  return out;
}

/** Best anytime cooking rate for an animal type, with the card providing it. */
export function bestCookRate(
  player: PlayerState,
  type: AnimalType,
): { card: CardDef; food: number } | null {
  let best: { card: CardDef; food: number } | null = null;
  for (const card of playedCards(player)) {
    const rate = card.cook?.[type];
    if (rate && (!best || rate > best.food)) best = { card, food: rate };
  }
  return best;
}

/** Receive goods from an action space: applies onGain card hooks, then adds
 *  resources to the supply and animals to the farm (auto-packed). Overflow
 *  animals are cooked at the best available rate, otherwise released. */
export function gainGoods(
  state: GameState,
  player: PlayerState,
  spaceId: string,
  goods: Goods,
): void {
  const gains: Goods = { ...goods };
  const ctx = hookCtx(state, player);
  for (const card of playedCards(player)) {
    card.onGain?.(ctx, spaceId, gains);
  }
  const animalGains: Partial<Record<AnimalType, number>> = {};
  for (const [good, n] of Object.entries(gains)) {
    if (!n) continue;
    if ((ANIMALS as readonly string[]).includes(good)) {
      animalGains[good as AnimalType] = n;
    } else {
      player.resources[good as keyof PlayerState["resources"]] += n;
    }
  }
  if (Object.keys(animalGains).length > 0) takeAnimals(state, player, animalGains);
}

/** Add animals to the farm, auto-packing; cook or release what cannot fit. */
export function takeAnimals(
  state: GameState,
  player: PlayerState,
  gained: Partial<Record<AnimalType, number>>,
): void {
  const counts: Record<AnimalType, number> = { ...player.animals };
  for (const t of ANIMALS) counts[t] += gained[t] ?? 0;
  const holding = maxRetention(player, counts, capacitySlots(player));
  for (const t of ANIMALS) {
    const overflow = counts[t] - holding.retained[t];
    player.animals[t] = holding.retained[t];
    if (overflow > 0) {
      const cook = bestCookRate(player, t);
      if (cook) {
        player.resources.food += cook.food * overflow;
        emit(
          state,
          player.idx,
          "cook",
          `${player.name} cooks ${overflow} ${t} for ${cook.food * overflow} food (no room)`,
        );
      } else {
        emit(state, player.idx, "release", `${player.name} releases ${overflow} ${t} (no room)`);
      }
    }
  }
}

/** Can the player accommodate these totals (with rearranging)? */
export function canAccommodate(player: PlayerState, counts: Record<AnimalType, number>): boolean {
  const holding = maxRetention(player, counts, capacitySlots(player));
  return ANIMALS.every((t) => holding.retained[t] >= counts[t]);
}
