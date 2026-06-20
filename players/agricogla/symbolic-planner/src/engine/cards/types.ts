import { CapacitySlot } from "../farmyard";
import { AnimalType, GameState, Good, Goods, HouseMaterial, PlayerState, Resource } from "../types";

/** Context passed to card hooks. Hooks mutate state directly (the engine works
 *  on a cloned state per step) and append log events via `emit`. */
export interface HookCtx {
  state: GameState;
  player: PlayerState;
  emit: (type: string, text: string) => void;
}

/** Anytime cooking rates: food per unit converted. */
export type CookRates = Partial<Record<AnimalType | "vegetable", number>>;

export interface BakeRates {
  /** Food per grain baked. */
  perGrain: number;
  /** Max grain converted per bake-bread action. */
  maxGrain: number;
}

export interface HarvestFood {
  from: Resource;
  food: number;
  /** Max units convertible per harvest. */
  max: number;
}

export interface Prereq {
  occupations?: number;
  label: string;
  check?: (p: PlayerState, s: GameState) => boolean;
}

export interface CardDef {
  id: string;
  kind: "occupation" | "minor" | "major";
  name: string;
  /** Rules text shown in the UI (this port's own wording). */
  text: string;
  cost?: Partial<Record<Resource, number>>;
  vp?: number;
  prereq?: Prereq;
  /** Traveling cards: passed to the left-hand neighbor after being played. */
  passing?: boolean;

  onPlay?: (ctx: HookCtx) => void;
  /** Fires for every played card at the start of each round (after reveal). */
  onRoundStart?: (ctx: HookCtx, round: number) => void;
  /** Adjust goods gained from an action space before they are received. */
  onGain?: (ctx: HookCtx, spaceId: string, gains: Goods) => void;
  /** Fires after the owning player resolves the named action space. */
  onAction?: (ctx: HookCtx, spaceId: string) => void;
  /** Fires during the harvest field phase. */
  onHarvest?: (ctx: HookCtx) => void;

  cook?: CookRates;
  bake?: BakeRates;
  harvestFood?: HarvestFood;
  capacity?: (p: PlayerState) => CapacitySlot[];
  bonusVp?: (p: PlayerState, s: GameState) => number;
  /** Extra fields plowable when taking a plow action (plow improvements). */
  plowExtra?: { fields: number; uses: number };
  /** Free fences granted on each fences action. */
  freeFences?: number;
  /** Discount per room when building rooms. */
  roomDiscount?: (material: HouseMaterial) => Goods;
}

export function gain(gains: Goods, good: Good, n: number): void {
  gains[good] = (gains[good] ?? 0) + n;
}
