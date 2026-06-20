import { CardDef } from "./types";
import { PlayerState } from "../types";

function tiered(count: number, tiers: [number, number][]): number {
  let pts = 0;
  for (const [threshold, points] of tiers) if (count >= threshold) pts = points;
  return pts;
}

function stored(p: PlayerState, res: "wood" | "clay" | "reed"): number {
  return p.resources[res];
}

export const majors: CardDef[] = [
  {
    id: "fireplace2",
    kind: "major",
    name: "Fireplace",
    cost: { clay: 2 },
    vp: 1,
    text: "Cook anytime: sheep 2, wild boar 2, cattle 3, vegetable 2 food. Bake bread: each grain becomes 2 food.",
    cook: { sheep: 2, boar: 2, cattle: 3, vegetable: 2 },
    bake: { perGrain: 2, maxGrain: 99 },
  },
  {
    id: "fireplace3",
    kind: "major",
    name: "Fireplace",
    cost: { clay: 3 },
    vp: 1,
    text: "Cook anytime: sheep 2, wild boar 2, cattle 3, vegetable 2 food. Bake bread: each grain becomes 2 food.",
    cook: { sheep: 2, boar: 2, cattle: 3, vegetable: 2 },
    bake: { perGrain: 2, maxGrain: 99 },
  },
  {
    id: "hearth4",
    kind: "major",
    name: "Cooking Hearth",
    cost: { clay: 4 },
    vp: 1,
    text: "Also buyable by returning a Fireplace. Cook anytime: sheep 2, wild boar 3, cattle 4, vegetable 3 food. Bake bread: each grain becomes 3 food.",
    cook: { sheep: 2, boar: 3, cattle: 4, vegetable: 3 },
    bake: { perGrain: 3, maxGrain: 99 },
  },
  {
    id: "hearth5",
    kind: "major",
    name: "Cooking Hearth",
    cost: { clay: 5 },
    vp: 1,
    text: "Also buyable by returning a Fireplace. Cook anytime: sheep 2, wild boar 3, cattle 4, vegetable 3 food. Bake bread: each grain becomes 3 food.",
    cook: { sheep: 2, boar: 3, cattle: 4, vegetable: 3 },
    bake: { perGrain: 3, maxGrain: 99 },
  },
  {
    id: "clay_oven",
    kind: "major",
    name: "Clay Oven",
    cost: { clay: 3, stone: 1 },
    vp: 2,
    text: "When you buy this, you may bake bread immediately. Bake bread: at most 1 grain becomes 5 food.",
    bake: { perGrain: 5, maxGrain: 1 },
  },
  {
    id: "stone_oven",
    kind: "major",
    name: "Stone Oven",
    cost: { clay: 1, stone: 3 },
    vp: 3,
    text: "When you buy this, you may bake bread immediately. Bake bread: at most 2 grain become 4 food each.",
    bake: { perGrain: 4, maxGrain: 2 },
  },
  {
    id: "joinery",
    kind: "major",
    name: "Joinery",
    cost: { wood: 2, stone: 2 },
    vp: 2,
    text: "Each harvest: may convert 1 wood to 2 food. End of game: 3/5/7 wood in your supply earn 1/2/3 bonus points.",
    harvestFood: { from: "wood", food: 2, max: 1 },
    bonusVp: (p) =>
      tiered(stored(p, "wood"), [
        [3, 1],
        [5, 2],
        [7, 3],
      ]),
  },
  {
    id: "pottery",
    kind: "major",
    name: "Pottery",
    cost: { clay: 2, stone: 2 },
    vp: 2,
    text: "Each harvest: may convert 1 clay to 2 food. End of game: 3/5/7 clay in your supply earn 1/2/3 bonus points.",
    harvestFood: { from: "clay", food: 2, max: 1 },
    bonusVp: (p) =>
      tiered(stored(p, "clay"), [
        [3, 1],
        [5, 2],
        [7, 3],
      ]),
  },
  {
    id: "basketmaker",
    kind: "major",
    name: "Basketmaker's Workshop",
    cost: { reed: 2, stone: 2 },
    vp: 2,
    text: "Each harvest: may convert 1 reed to 3 food. End of game: 2/4/5 reed in your supply earn 1/2/3 bonus points.",
    harvestFood: { from: "reed", food: 3, max: 1 },
    bonusVp: (p) =>
      tiered(stored(p, "reed"), [
        [2, 1],
        [4, 2],
        [5, 3],
      ]),
  },
  {
    id: "well",
    kind: "major",
    name: "Well",
    cost: { wood: 1, stone: 3 },
    vp: 4,
    text: "Place 1 food on each of the next 5 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 5); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "food", count: 1 });
      }
    },
  },
];
