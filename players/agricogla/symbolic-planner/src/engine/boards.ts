import { shuffled, Rng } from "./rng";
import { Goods } from "./types";

export interface SpaceDef {
  id: string;
  title: string;
  /** Goods added every replenish phase. */
  accumulates?: Goods;
  /** Goods granted directly when used (non-accumulating printed goods). */
  fixedGoods?: Goods;
  /** Round-card stage (1..6) if this space enters play via the round deck. */
  stage?: number;
  /** Short label of what the action does, for menus/prompts. */
  summary: string;
}

const fixedSpaces: SpaceDef[] = [
  {
    id: "farm_expansion",
    title: "Farm Expansion",
    summary: "Build room(s) at 5 wood + 2 reed each and/or stable(s) at 2 wood each",
  },
  {
    id: "meeting_place",
    title: "Meeting Place",
    summary: "Become starting player; may also play 1 minor improvement",
  },
  { id: "grain_seeds", title: "Grain Seeds", fixedGoods: { grain: 1 }, summary: "Take 1 grain" },
  { id: "farmland", title: "Farmland", summary: "Plow 1 field" },
  {
    id: "lessons",
    title: "Lessons",
    summary: "Play 1 occupation (first is free, later ones cost 1 food)",
  },
  { id: "day_laborer", title: "Day Laborer", fixedGoods: { food: 2 }, summary: "Take 2 food" },
  { id: "forest", title: "Forest", accumulates: { wood: 3 }, summary: "Take all wood" },
  { id: "clay_pit", title: "Clay Pit", accumulates: { clay: 1 }, summary: "Take all clay" },
  { id: "reed_bank", title: "Reed Bank", accumulates: { reed: 1 }, summary: "Take all reed" },
  { id: "fishing", title: "Fishing", accumulates: { food: 1 }, summary: "Take all food" },
];

const threePlayerSpaces: SpaceDef[] = [
  { id: "grove", title: "Grove", accumulates: { wood: 2 }, summary: "Take all wood" },
  { id: "hollow", title: "Hollow", accumulates: { clay: 1 }, summary: "Take all clay" },
  {
    id: "quarry_stall",
    title: "Stonecutter's Stall",
    fixedGoods: { stone: 1 },
    summary: "Take 1 stone",
  },
  {
    id: "lessons_b",
    title: "Lessons II",
    summary: "Play 1 occupation (costs 2 food)",
  },
];

const fourPlayerSpaces: SpaceDef[] = [
  { id: "copse", title: "Copse", accumulates: { wood: 1 }, summary: "Take all wood" },
  { id: "grove", title: "Grove", accumulates: { wood: 2 }, summary: "Take all wood" },
  { id: "hollow", title: "Hollow", accumulates: { clay: 2 }, summary: "Take all clay" },
  {
    id: "resource_market",
    title: "Resource Market",
    fixedGoods: { reed: 1, stone: 1, food: 1 },
    summary: "Take 1 reed, 1 stone and 1 food",
  },
  {
    id: "traveling_players",
    title: "Traveling Players",
    accumulates: { food: 1 },
    summary: "Take all food",
  },
  {
    id: "lessons_b",
    title: "Lessons II",
    summary: "Play 1 occupation (1 food for your first two occupations, then 2)",
  },
];

export const roundCards: SpaceDef[] = [
  // Stage 1
  {
    id: "r_improvement",
    title: "Improvement",
    stage: 1,
    summary: "Buy 1 major improvement or play 1 minor improvement",
  },
  {
    id: "r_sheep",
    title: "Sheep Market",
    stage: 1,
    accumulates: { sheep: 1 },
    summary: "Take all sheep",
  },
  { id: "r_fences", title: "Fences", stage: 1, summary: "Build fences at 1 wood each" },
  { id: "r_sow_bake", title: "Grain Utilization", stage: 1, summary: "Sow and/or bake bread" },
  // Stage 2
  {
    id: "r_west_quarry",
    title: "Western Quarry",
    stage: 2,
    accumulates: { stone: 1 },
    summary: "Take all stone",
  },
  {
    id: "r_renovate_improve",
    title: "House Redevelopment",
    stage: 2,
    summary: "Renovate your home, then you may buy/play 1 improvement",
  },
  {
    id: "r_family_growth",
    title: "Wish for Children",
    stage: 2,
    summary: "Family growth (needs a free room), then you may play 1 minor improvement",
  },
  // Stage 3
  {
    id: "r_vegetable",
    title: "Vegetable Seeds",
    stage: 3,
    fixedGoods: { vegetable: 1 },
    summary: "Take 1 vegetable",
  },
  {
    id: "r_boar",
    title: "Pig Market",
    stage: 3,
    accumulates: { boar: 1 },
    summary: "Take all wild boar",
  },
  // Stage 4
  {
    id: "r_east_quarry",
    title: "Eastern Quarry",
    stage: 4,
    accumulates: { stone: 1 },
    summary: "Take all stone",
  },
  {
    id: "r_cattle",
    title: "Cattle Market",
    stage: 4,
    accumulates: { cattle: 1 },
    summary: "Take all cattle",
  },
  // Stage 5
  {
    id: "r_urgent_family",
    title: "Urgent Wish for Children",
    stage: 5,
    summary: "Family growth even without room in your home",
  },
  {
    id: "r_cultivation",
    title: "Cultivation",
    stage: 5,
    summary: "Plow 1 field and/or sow",
  },
  // Stage 6
  {
    id: "r_redevelop",
    title: "Farm Redevelopment",
    stage: 6,
    summary: "Renovate your home, then you may build fences",
  },
];

/** Rounds at whose end a harvest occurs. */
export const HARVEST_ROUNDS = new Set([4, 7, 9, 11, 13, 14]);
export const TOTAL_ROUNDS = 14;

export function stageOfRound(round: number): number {
  if (round <= 4) return 1;
  if (round <= 7) return 2;
  if (round <= 9) return 3;
  if (round <= 11) return 4;
  if (round <= 13) return 5;
  return 6;
}

const spaceIndexById = new Map<string, SpaceDef>();
for (const def of [...fixedSpaces, ...threePlayerSpaces, ...fourPlayerSpaces, ...roundCards]) {
  // 3p/4p variants of grove/hollow/lessons_b share ids; player count decides
  // which definition is live (resolved through boardSpaces at setup).
  if (!spaceIndexById.has(def.id)) spaceIndexById.set(def.id, def);
}

/** Action spaces present from round 1 for the given player count. */
export function boardSpaces(numPlayers: number): SpaceDef[] {
  if (numPlayers < 1 || numPlayers > 4) throw new Error("supported player counts: 1-4");
  const out = fixedSpaces.map((d) => ({ ...d }));
  if (numPlayers === 1) {
    const forest = out.find((d) => d.id === "forest")!;
    forest.accumulates = { wood: 2 };
  }
  if (numPlayers === 3) out.push(...threePlayerSpaces.map((d) => ({ ...d })));
  if (numPlayers === 4) out.push(...fourPlayerSpaces.map((d) => ({ ...d })));
  return out;
}

/** The 14-round deck: stages in order, cards shuffled within each stage. */
export function buildRoundDeck(rng: Rng): string[] {
  const out: string[] = [];
  for (let stage = 1; stage <= 6; stage++) {
    const cards = roundCards.filter((c) => c.stage === stage).map((c) => c.id);
    out.push(...shuffled(rng, cards));
  }
  return out;
}

export function spaceDef(id: string, numPlayers: number): SpaceDef {
  if (numPlayers >= 3) {
    const pool = numPlayers === 3 ? threePlayerSpaces : fourPlayerSpaces;
    const hit = pool.find((d) => d.id === id);
    if (hit) return hit;
  }
  const def = spaceIndexById.get(id);
  if (!def) throw new Error(`unknown action space: ${id}`);
  if (id === "forest" && numPlayers === 1) return { ...def, accumulates: { wood: 2 } };
  return def;
}
