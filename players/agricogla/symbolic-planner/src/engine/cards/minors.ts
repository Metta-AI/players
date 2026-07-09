import { CardDef, gain } from "./types";

/** The minor improvement deck. Card names and texts are this port's own;
 *  mechanics follow the base-deck archetypes. All effects are implemented. */

const GROWTH_ACTIONS = ["r_family_growth", "r_urgent_family"];

export const minors: CardDef[] = [
  // --- plows ----------------------------------------------------------------
  {
    id: "min_wooden_plow",
    kind: "minor",
    name: "Wooden Plow",
    cost: { wood: 1 },
    text: "On 2 future plow actions, you may plow 1 extra field each time.",
    plowExtra: { fields: 1, uses: 2 },
  },
  {
    id: "min_heavy_plow",
    kind: "minor",
    name: "Heavy Plow",
    cost: { wood: 1, stone: 1 },
    vp: 1,
    text: "On 3 future plow actions, you may plow 1 extra field each time.",
    plowExtra: { fields: 1, uses: 3 },
  },
  // --- baking & cooking -----------------------------------------------------
  {
    id: "min_hearth_stones",
    kind: "minor",
    name: "Hearth Stones",
    cost: { stone: 1 },
    text: "When you bake bread, you may convert up to 2 grain into 2 food each with this card.",
    bake: { perGrain: 2, maxGrain: 2 },
  },
  {
    id: "min_dough_trough",
    kind: "minor",
    name: "Dough Trough",
    cost: { wood: 1 },
    text: "When you bake bread, you may convert up to 1 grain into 2 food with this card.",
    bake: { perGrain: 2, maxGrain: 1 },
  },
  {
    id: "min_cooking_corner",
    kind: "minor",
    name: "Cooking Corner",
    cost: { clay: 1 },
    text: "You can convert vegetables to 2 food and sheep to 2 food anytime.",
    cook: { vegetable: 2, sheep: 2 },
  },
  {
    id: "min_smokehouse",
    kind: "minor",
    name: "Smokehouse",
    cost: { wood: 1, stone: 1 },
    vp: 1,
    text: "You can convert wild boar to 3 food and sheep to 2 food anytime.",
    cook: { boar: 3, sheep: 2 },
  },
  {
    id: "min_stewpot",
    kind: "minor",
    name: "Stewpot",
    cost: { clay: 1 },
    text: "You can convert sheep to 2 food, wild boar to 2 food and vegetables to 2 food anytime.",
    cook: { sheep: 2, boar: 2, vegetable: 2 },
  },
  // --- animal capacity ------------------------------------------------------
  {
    id: "min_animal_pen",
    kind: "minor",
    name: "Animal Pen",
    cost: { wood: 1 },
    text: "This card can hold 2 animals of one type.",
    capacity: () => [{ capacity: 2 }],
  },
  {
    id: "min_pig_sty",
    kind: "minor",
    name: "Pig Sty",
    cost: { wood: 1 },
    text: "This card can hold 2 wild boar.",
    capacity: () => [{ type: "boar", capacity: 2 }],
  },
  {
    id: "min_cattle_shed",
    kind: "minor",
    name: "Cattle Shed",
    cost: { wood: 1, reed: 1 },
    vp: 1,
    text: "This card can hold 2 cattle.",
    capacity: () => [{ type: "cattle", capacity: 2 }],
  },
  {
    id: "min_sheep_fold",
    kind: "minor",
    name: "Sheep Fold",
    cost: { wood: 1 },
    text: "This card can hold 2 sheep.",
    capacity: () => [{ type: "sheep", capacity: 2 }],
  },
  {
    id: "min_paddock",
    kind: "minor",
    name: "Paddock",
    cost: { wood: 2 },
    vp: 1,
    prereq: { occupations: 1, label: "1 occupation" },
    text: "This card can hold 3 animals of one type.",
    capacity: () => [{ capacity: 3 }],
  },
  // --- scheduled goods on round spaces ---------------------------------------
  {
    id: "min_carp_pond",
    kind: "minor",
    name: "Carp Pond",
    cost: { food: 1 },
    vp: 1,
    prereq: { occupations: 2, label: "2 occupations" },
    text: "Place 1 food on each of the next 4 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 4); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "food", count: 1 });
      }
    },
  },
  {
    id: "min_reed_pond",
    kind: "minor",
    name: "Reed Pond",
    cost: { food: 1 },
    vp: 1,
    prereq: { occupations: 3, label: "3 occupations" },
    text: "Place 1 reed on each of the next 3 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 3); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "reed", count: 1 });
      }
    },
  },
  {
    id: "min_clay_deposit",
    kind: "minor",
    name: "Clay Deposit",
    cost: { food: 1 },
    text: "Place 1 clay on each of the next 3 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 3); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "clay", count: 1 });
      }
    },
  },
  {
    id: "min_wood_cache",
    kind: "minor",
    name: "Wood Cache",
    cost: { food: 1 },
    text: "Place 1 wood on each of the next 3 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 3); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "wood", count: 1 });
      }
    },
  },
  {
    id: "min_seed_stock",
    kind: "minor",
    name: "Seed Stock",
    cost: { food: 1 },
    text: "Place 1 grain on each of the next 2 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 2); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "grain", count: 1 });
      }
    },
  },
  // --- immediate gains --------------------------------------------------------
  {
    id: "min_wood_cart",
    kind: "minor",
    name: "Wood Cart",
    cost: { food: 1 },
    prereq: { occupations: 1, label: "1 occupation" },
    text: "When played, gain 3 wood.",
    onPlay: (ctx) => {
      ctx.player.resources.wood += 3;
    },
  },
  {
    id: "min_clay_pit_claim",
    kind: "minor",
    name: "Clay Pit Claim",
    cost: { food: 1 },
    text: "When played, gain 2 clay.",
    onPlay: (ctx) => {
      ctx.player.resources.clay += 2;
    },
  },
  {
    id: "min_market_stall",
    kind: "minor",
    name: "Market Stall",
    cost: { grain: 1 },
    text: "When played, gain 1 vegetable and 1 food.",
    onPlay: (ctx) => {
      ctx.player.resources.vegetable += 1;
      ctx.player.resources.food += 1;
    },
  },
  {
    id: "min_stone_cart",
    kind: "minor",
    name: "Stone Cart",
    cost: { wood: 1 },
    prereq: { occupations: 2, label: "2 occupations" },
    text: "When played, gain 2 stone.",
    onPlay: (ctx) => {
      ctx.player.resources.stone += 2;
    },
  },
  // --- gains on actions -------------------------------------------------------
  {
    id: "min_threshing_board",
    kind: "minor",
    name: "Threshing Board",
    cost: { wood: 1 },
    vp: 1,
    prereq: { occupations: 2, label: "2 occupations" },
    text: "Whenever you use the Grain Seeds space, take 1 extra grain.",
    onGain: (_ctx, spaceId, gains) => {
      if (spaceId === "grain_seeds") gain(gains, "grain", 1);
    },
  },
  {
    id: "min_fish_weir",
    kind: "minor",
    name: "Fish Weir",
    cost: { reed: 1 },
    text: "Whenever you use the Fishing space, take 1 extra food.",
    onGain: (_ctx, spaceId, gains) => {
      if (spaceId === "fishing") gain(gains, "food", 1);
    },
  },
  {
    id: "min_handcart",
    kind: "minor",
    name: "Handcart",
    cost: { wood: 2 },
    vp: 1,
    text: "Whenever you take wood from an action space, take 1 extra wood.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.wood ?? 0) > 0) gain(gains, "wood", 1);
    },
  },
  {
    id: "min_shepherds_crook",
    kind: "minor",
    name: "Shepherd's Crook",
    cost: { wood: 1 },
    text: "Whenever you take sheep from an action space, take 1 extra sheep.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.sheep ?? 0) > 0) gain(gains, "sheep", 1);
    },
  },
  {
    id: "min_pig_trough",
    kind: "minor",
    name: "Pig Trough",
    cost: { wood: 1 },
    text: "Whenever you take wild boar from an action space, take 1 extra wild boar.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.boar ?? 0) > 0) gain(gains, "boar", 1);
    },
  },
  {
    id: "min_cattle_prod",
    kind: "minor",
    name: "Drover's Staff",
    cost: { wood: 1, stone: 1 },
    vp: 1,
    prereq: { occupations: 1, label: "1 occupation" },
    text: "Whenever you take cattle from an action space, take 1 extra cattle.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.cattle ?? 0) > 0) gain(gains, "cattle", 1);
    },
  },
  // --- building discounts -----------------------------------------------------
  {
    id: "min_timber_yard",
    kind: "minor",
    name: "Timber Yard",
    cost: { food: 1 },
    vp: 1,
    prereq: { occupations: 2, label: "2 occupations" },
    text: "Wooden rooms cost you 1 less wood.",
    roomDiscount: (material) => (material === "wood" ? { wood: 1 } : {}),
  },
  {
    id: "min_clay_works",
    kind: "minor",
    name: "Clay Works",
    cost: { food: 1 },
    vp: 1,
    prereq: { occupations: 2, label: "2 occupations" },
    text: "Clay rooms cost you 1 less clay.",
    roomDiscount: (material) => (material === "clay" ? { clay: 1 } : {}),
  },
  {
    id: "min_stone_yard",
    kind: "minor",
    name: "Stone Yard",
    cost: { food: 1 },
    vp: 1,
    prereq: { occupations: 2, label: "2 occupations" },
    text: "Stone rooms cost you 1 less stone.",
    roomDiscount: (material) => (material === "stone" ? { stone: 1 } : {}),
  },
  {
    id: "min_fence_posts",
    kind: "minor",
    name: "Fence Posts",
    cost: { wood: 1 },
    text: "Each time you build fences, 1 of those fences is free.",
    freeFences: 1,
  },
  // --- harvest helpers --------------------------------------------------------
  {
    id: "min_herb_garden",
    kind: "minor",
    name: "Herb Garden",
    cost: { wood: 1 },
    vp: 1,
    text: "At each harvest, gain 1 food if you have at least 1 field.",
    onHarvest: (ctx) => {
      if (ctx.player.spaces.some((s) => s.kind === "field")) {
        ctx.player.resources.food += 1;
        ctx.emit("card", `${ctx.player.name} gains 1 food (Herb Garden)`);
      }
    },
  },
  {
    id: "min_milk_pail",
    kind: "minor",
    name: "Milk Pail",
    cost: { wood: 1 },
    text: "At each harvest, gain 1 food for every 3 cattle you have.",
    onHarvest: (ctx) => {
      const food = Math.floor(ctx.player.animals.cattle / 3);
      if (food > 0) {
        ctx.player.resources.food += food;
        ctx.emit("card", `${ctx.player.name} gains ${food} food (Milk Pail)`);
      }
    },
  },
  {
    id: "min_shearing_shears",
    kind: "minor",
    name: "Shearing Shears",
    cost: { wood: 1 },
    vp: 1,
    text: "At each harvest, gain 1 food for every 4 sheep you have.",
    onHarvest: (ctx) => {
      const food = Math.floor(ctx.player.animals.sheep / 4);
      if (food > 0) {
        ctx.player.resources.food += food;
        ctx.emit("card", `${ctx.player.name} gains ${food} food (Shearing Shears)`);
      }
    },
  },
  {
    id: "min_drying_shed",
    kind: "minor",
    name: "Drying Shed",
    cost: { clay: 1 },
    text: "At each harvest, gain 1 food if you have at least 2 animal types on your farm.",
    onHarvest: (ctx) => {
      const types = (["sheep", "boar", "cattle"] as const).filter(
        (t) => ctx.player.animals[t] > 0,
      ).length;
      if (types >= 2) {
        ctx.player.resources.food += 1;
        ctx.emit("card", `${ctx.player.name} gains 1 food (Drying Shed)`);
      }
    },
  },
  // --- round-start engines ----------------------------------------------------
  {
    id: "min_dovecote",
    kind: "minor",
    name: "Dovecote",
    cost: { stone: 2 },
    vp: 2,
    text: "At the start of each round from round 10 on, gain 1 food.",
    onRoundStart: (ctx, round) => {
      if (round >= 10) {
        ctx.player.resources.food += 1;
        ctx.emit("card", `${ctx.player.name} gains 1 food (Dovecote)`);
      }
    },
  },
  {
    id: "min_rain_barrel",
    kind: "minor",
    name: "Rain Barrel",
    cost: { wood: 1 },
    text: "At the start of each round from round 8 on, gain 1 food every even round.",
    onRoundStart: (ctx, round) => {
      if (round >= 8 && round % 2 === 0) {
        ctx.player.resources.food += 1;
        ctx.emit("card", `${ctx.player.name} gains 1 food (Rain Barrel)`);
      }
    },
  },
  // --- family ----------------------------------------------------------------
  {
    id: "min_cradle",
    kind: "minor",
    name: "Cradle",
    cost: { wood: 1 },
    vp: 1,
    text: "After each family growth action you take, gain 2 food.",
    onAction: (ctx, spaceId) => {
      if (GROWTH_ACTIONS.includes(spaceId)) {
        ctx.player.resources.food += 2;
        ctx.emit("card", `${ctx.player.name} gains 2 food (Cradle)`);
      }
    },
  },
  {
    id: "min_toy_chest",
    kind: "minor",
    name: "Toy Chest",
    cost: { wood: 1 },
    text: "End of game: 1 bonus point for each family member beyond the first 3.",
    bonusVp: (p) => Math.max(0, p.family.length - 3),
  },
  // --- pure / bonus points -----------------------------------------------------
  {
    id: "min_carved_chest",
    kind: "minor",
    name: "Carved Chest",
    cost: { wood: 2 },
    vp: 2,
    prereq: { occupations: 1, label: "1 occupation" },
    text: "A fine piece of furniture. Worth 2 points.",
  },
  {
    id: "min_pewter_jug",
    kind: "minor",
    name: "Pewter Jug",
    cost: { stone: 1 },
    vp: 1,
    text: "Worth 1 point.",
  },
  {
    id: "min_gabled_house",
    kind: "minor",
    name: "Gabled Roof",
    cost: { wood: 1, reed: 1 },
    vp: 3,
    prereq: {
      label: "stone house",
      check: (p) => p.houseMaterial === "stone",
    },
    text: "Requires a stone house. Worth 3 points.",
  },
  {
    id: "min_grain_loft",
    kind: "minor",
    name: "Grain Loft",
    cost: { wood: 1, clay: 1 },
    vp: 1,
    text: "End of game: 1 bonus point for every 4 grain you have (in supply and on fields).",
    bonusVp: (p) => {
      const grain =
        p.resources.grain +
        p.spaces.reduce((s, sp) => s + (sp.crop === "grain" ? sp.cropCount : 0), 0);
      return Math.floor(grain / 4);
    },
  },
  {
    id: "min_root_cellar",
    kind: "minor",
    name: "Root Cellar",
    cost: { stone: 1 },
    vp: 1,
    text: "End of game: 1 bonus point for every 3 vegetables you have (in supply and on fields).",
    bonusVp: (p) => {
      const veg =
        p.resources.vegetable +
        p.spaces.reduce((s, sp) => s + (sp.crop === "vegetable" ? sp.cropCount : 0), 0);
      return Math.floor(veg / 3);
    },
  },
  {
    id: "min_hunting_trophies",
    kind: "minor",
    name: "Hunting Trophies",
    cost: { wood: 1 },
    text: "End of game: 1 bonus point for each animal type of which you have at least 5.",
    bonusVp: (p) =>
      (p.animals.sheep >= 5 ? 1 : 0) +
      (p.animals.boar >= 5 ? 1 : 0) +
      (p.animals.cattle >= 5 ? 1 : 0),
  },
  {
    id: "min_scarecrow",
    kind: "minor",
    name: "Scarecrow",
    cost: { wood: 1 },
    vp: 1,
    text: "End of game: 1 bonus point if at least 2 of your fields are sown.",
    bonusVp: (p) =>
      p.spaces.filter((s) => s.kind === "field" && s.cropCount > 0).length >= 2 ? 1 : 0,
  },
  {
    id: "min_well_bucket",
    kind: "minor",
    name: "Well Bucket",
    cost: { wood: 1 },
    text: "End of game: 2 bonus points if you own the Well.",
    bonusVp: (p) => (p.majors.includes("well") ? 2 : 0),
  },
  // --- traveling (passing) cards ----------------------------------------------
  {
    id: "min_lending_cart",
    kind: "minor",
    name: "Lending Cart",
    cost: {},
    passing: true,
    text: "When played, gain 2 wood. Then pass this card to the player on your left.",
    onPlay: (ctx) => {
      ctx.player.resources.wood += 2;
    },
  },
  {
    id: "min_traveling_tinker",
    kind: "minor",
    name: "Traveling Tinker",
    cost: {},
    passing: true,
    text: "When played, gain 1 clay and 1 food. Then pass this card to the player on your left.",
    onPlay: (ctx) => {
      ctx.player.resources.clay += 1;
      ctx.player.resources.food += 1;
    },
  },
  {
    id: "min_seed_swap",
    kind: "minor",
    name: "Seed Swap",
    cost: {},
    passing: true,
    text: "When played, gain 1 grain. Then pass this card to the player on your left.",
    onPlay: (ctx) => {
      ctx.player.resources.grain += 1;
    },
  },
];
