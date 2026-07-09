/** Core engine types. Everything in GameState is JSON-serializable; card
 *  behavior lives in code (cards/*.ts) keyed by card id. */

export const RESOURCES = ["wood", "clay", "reed", "stone", "grain", "vegetable", "food"] as const;
export type Resource = (typeof RESOURCES)[number];

export const ANIMALS = ["sheep", "boar", "cattle"] as const;
export type AnimalType = (typeof ANIMALS)[number];

export type Good = Resource | AnimalType;
export const GOODS: readonly Good[] = [...RESOURCES, ...ANIMALS];

export type HouseMaterial = "wood" | "clay" | "stone";

export type Goods = Partial<Record<Good, number>>;

/** Farmyard: 3 rows x 5 cols, space index = row * 5 + col. */
export const ROWS = 3;
export const COLS = 5;
export const NUM_SPACES = ROWS * COLS;

export type CropType = "grain" | "vegetable";

export interface FarmSpace {
  kind: "empty" | "room" | "field";
  stable: boolean;
  crop: CropType | null;
  cropCount: number;
}

/** Fence edge ids: "h-r-c" horizontal edge above row r (r 0..3) at col c (0..4);
 *  "v-r-c" vertical edge left of col c (c 0..5) at row r (0..2). */
export type EdgeId = string;

export interface FamilyMember {
  /** Round the member was born; 0 for the starting pair. */
  bornRound: number;
  /** Placed on an action space this round? */
  placed: boolean;
}

export interface PlayerState {
  idx: number;
  name: string;
  color: string;
  resources: Record<Resource, number>;
  animals: Record<AnimalType, number>;
  spaces: FarmSpace[];
  fences: EdgeId[];
  fencesBuilt: number; // lifetime, max 15
  houseMaterial: HouseMaterial;
  family: FamilyMember[];
  beggingCards: number;
  startingPlayerMarker: boolean;
  handOccupations: string[];
  handMinors: string[];
  occupations: string[];
  minors: string[];
  majors: string[];
  /** Per-card persistent counters (uses left, goods stored on card, etc.). */
  cardData: Record<string, Record<string, number>>;
}

export interface ActionSpaceState {
  id: string;
  /** Player idx occupying it this round, or null. */
  occupiedBy: number | null;
  /** Goods piled on the space (accumulation spaces). */
  pile: Goods;
}

/** Goods scheduled onto future round spaces (e.g. the Well). */
export interface ScheduledGood {
  round: number;
  playerIdx: number;
  good: Good;
  count: number;
}

export type Phase = "work" | "feeding" | "finished";

export interface GameEvent {
  round: number;
  playerIdx: number | null;
  type: string;
  text: string;
}

export interface GameState {
  seed: number;
  numPlayers: number;
  solo: boolean;
  round: number; // 1..14 during play
  phase: Phase;
  startingPlayer: number;
  currentPlayer: number;
  /** Players who still need to submit a feeding decision this harvest. */
  toFeed: number[];
  actionSpaces: ActionSpaceState[];
  /** Upcoming round-card action ids, index 0 = next round to reveal. */
  roundDeck: string[];
  majorsAvailable: string[];
  scheduled: ScheduledGood[];
  players: PlayerState[];
  log: GameEvent[];
  /** Final scores, set when phase becomes finished. */
  scores: ScoreSheet[] | null;
}

export interface ScoreCategory {
  label: string;
  points: number;
  detail: string;
}

export interface ScoreSheet {
  playerIdx: number;
  categories: ScoreCategory[];
  total: number;
}

export function emptyGoods(): Record<Good, number> {
  return Object.fromEntries(GOODS.map((g) => [g, 0])) as Record<Good, number>;
}

export function addGoods(target: Goods, extra: Goods): void {
  for (const [g, n] of Object.entries(extra)) {
    if (!n) continue;
    target[g as Good] = (target[g as Good] ?? 0) + n;
  }
}

export function goodsToText(goods: Goods): string {
  const parts = Object.entries(goods)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([g, n]) => `${n} ${g}`);
  return parts.length ? parts.join(", ") : "nothing";
}

export function spaceIndex(row: number, col: number): number {
  return row * COLS + col;
}

export function rowOf(space: number): number {
  return Math.floor(space / COLS);
}

export function colOf(space: number): number {
  return space % COLS;
}
