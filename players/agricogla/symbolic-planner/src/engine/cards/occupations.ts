import { CardDef, gain } from "./types";
import { computePastures } from "../farmyard";

/** The occupation deck. Card names and texts are this port's own; mechanics
 *  follow the archetypes of the base game decks (resource bonuses, plows,
 *  cooking, capacity, bonus points, harvest engines). Every effect below is
 *  fully implemented through the hook system. */

const RENOVATE_ACTIONS = ["r_renovate_improve", "r_redevelop"];
const GROWTH_ACTIONS = ["r_family_growth", "r_urgent_family"];

export const occupations: CardDef[] = [
  // --- gains on resource actions -------------------------------------------
  {
    id: "occ_lumberjack",
    kind: "occupation",
    name: "Lumberjack",
    text: "Whenever you take wood from an action space, take 1 extra wood.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.wood ?? 0) > 0) gain(gains, "wood", 1);
    },
  },
  {
    id: "occ_clay_digger",
    kind: "occupation",
    name: "Clay Digger",
    text: "Whenever you take clay from an action space, take 1 extra clay.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.clay ?? 0) > 0) gain(gains, "clay", 1);
    },
  },
  {
    id: "occ_reed_gatherer",
    kind: "occupation",
    name: "Reed Gatherer",
    text: "Whenever you take reed from an action space, take 1 extra reed.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.reed ?? 0) > 0) gain(gains, "reed", 1);
    },
  },
  {
    id: "occ_quarryman",
    kind: "occupation",
    name: "Quarryman",
    text: "Whenever you take stone from an action space, take 1 extra stone.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.stone ?? 0) > 0) gain(gains, "stone", 1);
    },
  },
  {
    id: "occ_angler",
    kind: "occupation",
    name: "Angler",
    text: "Whenever you use the Fishing space, take 2 extra food.",
    onGain: (_ctx, spaceId, gains) => {
      if (spaceId === "fishing") gain(gains, "food", 2);
    },
  },
  {
    id: "occ_seasonal_hand",
    kind: "occupation",
    name: "Seasonal Hand",
    text: "Whenever you use the Day Laborer space, also take 1 grain.",
    onGain: (_ctx, spaceId, gains) => {
      if (spaceId === "day_laborer") gain(gains, "grain", 1);
    },
  },
  {
    id: "occ_peddler",
    kind: "occupation",
    name: "Peddler",
    text: "Whenever you use the Day Laborer space, also take 1 clay.",
    onGain: (_ctx, spaceId, gains) => {
      if (spaceId === "day_laborer") gain(gains, "clay", 1);
    },
  },
  {
    id: "occ_greengrocer",
    kind: "occupation",
    name: "Greengrocer",
    text: "Whenever you use the Grain Seeds space, also take 1 vegetable.",
    onGain: (_ctx, spaceId, gains) => {
      if (spaceId === "grain_seeds") gain(gains, "vegetable", 1);
    },
  },
  {
    id: "occ_quarry_foreman",
    kind: "occupation",
    name: "Quarry Foreman",
    text: "Whenever you take stone from an action space, also take 1 food.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.stone ?? 0) > 0) gain(gains, "food", 1);
    },
  },
  {
    id: "occ_shepherds_friend",
    kind: "occupation",
    name: "Shepherd's Friend",
    text: "Whenever you take sheep from an action space, take 1 extra sheep.",
    onGain: (_ctx, _spaceId, gains) => {
      if ((gains.sheep ?? 0) > 0) gain(gains, "sheep", 1);
    },
  },
  {
    id: "occ_wayfarer",
    kind: "occupation",
    name: "Wayfarer",
    text: "Whenever you use Traveling Players, take 1 extra food and 1 wood.",
    onGain: (_ctx, spaceId, gains) => {
      if (spaceId === "traveling_players") {
        gain(gains, "food", 1);
        gain(gains, "wood", 1);
      }
    },
  },
  // --- cooking and baking ---------------------------------------------------
  {
    id: "occ_butcher",
    kind: "occupation",
    name: "Butcher",
    text: "You can convert animals to food anytime: sheep 2, wild boar 2, cattle 3.",
    cook: { sheep: 2, boar: 2, cattle: 3 },
  },
  {
    id: "occ_charcutier",
    kind: "occupation",
    name: "Charcutier",
    text: "You can convert wild boar to 3 food anytime.",
    cook: { boar: 3 },
  },
  {
    id: "occ_mutton_cook",
    kind: "occupation",
    name: "Mutton Cook",
    text: "You can convert sheep to 3 food anytime.",
    cook: { sheep: 3 },
  },
  {
    id: "occ_field_cook",
    kind: "occupation",
    name: "Field Cook",
    text: "You can convert vegetables to 2 food anytime.",
    cook: { vegetable: 2 },
  },
  {
    id: "occ_baker",
    kind: "occupation",
    name: "Baker",
    text: "When you bake bread, you may convert up to 1 grain into 2 food with this card.",
    bake: { perGrain: 2, maxGrain: 1 },
  },
  {
    id: "occ_miller",
    kind: "occupation",
    name: "Miller",
    text: "When you bake bread, you may convert up to 1 grain into 3 food with this card.",
    prereq: { occupations: 1, label: "1 occupation" },
    bake: { perGrain: 3, maxGrain: 1 },
  },
  // --- plows ----------------------------------------------------------------
  {
    id: "occ_plowwright",
    kind: "occupation",
    name: "Plowwright",
    text: "On 3 future plow actions, you may plow 1 extra field each time.",
    plowExtra: { fields: 1, uses: 3 },
  },
  {
    id: "occ_furrow_master",
    kind: "occupation",
    name: "Furrow Master",
    text: "On 1 future plow action, you may plow 2 extra fields.",
    plowExtra: { fields: 2, uses: 1 },
  },
  // --- animal capacity ------------------------------------------------------
  {
    id: "occ_stablemaster",
    kind: "occupation",
    name: "Stablemaster",
    text: "Your home can hold 1 additional animal of any type.",
    capacity: () => [{ capacity: 1 }],
  },
  {
    id: "occ_swineherd",
    kind: "occupation",
    name: "Swineherd",
    text: "This card can hold 2 wild boar.",
    capacity: () => [{ type: "boar", capacity: 2 }],
  },
  {
    id: "occ_cowherd",
    kind: "occupation",
    name: "Cowherd",
    text: "This card can hold 2 cattle.",
    capacity: () => [{ type: "cattle", capacity: 2 }],
  },
  {
    id: "occ_shepherd",
    kind: "occupation",
    name: "Shepherd",
    text: "This card can hold 2 sheep.",
    capacity: () => [{ type: "sheep", capacity: 2 }],
  },
  // --- building -------------------------------------------------------------
  {
    id: "occ_carpenter",
    kind: "occupation",
    name: "Carpenter",
    text: "Wooden rooms cost you 2 less wood.",
    roomDiscount: (material) => (material === "wood" ? { wood: 2 } : {}),
  },
  {
    id: "occ_bricklayer",
    kind: "occupation",
    name: "Bricklayer",
    text: "Clay rooms cost you 2 less clay.",
    roomDiscount: (material) => (material === "clay" ? { clay: 2 } : {}),
  },
  {
    id: "occ_mason",
    kind: "occupation",
    name: "Mason",
    text: "Stone rooms cost you 2 less stone.",
    roomDiscount: (material) => (material === "stone" ? { stone: 2 } : {}),
  },
  {
    id: "occ_thatcher",
    kind: "occupation",
    name: "Thatcher",
    text: "Rooms cost you 1 less reed.",
    roomDiscount: () => ({ reed: 1 }),
  },
  {
    id: "occ_hedge_warden",
    kind: "occupation",
    name: "Hedge Warden",
    text: "Each time you build fences, 2 of those fences are free.",
    freeFences: 2,
  },
  {
    id: "occ_stable_boy",
    kind: "occupation",
    name: "Stable Boy",
    text: "After you use a renovation action, take 1 reed.",
    onAction: (ctx, spaceId) => {
      if (RENOVATE_ACTIONS.includes(spaceId)) {
        ctx.player.resources.reed += 1;
        ctx.emit("card", `${ctx.player.name} takes 1 reed (Stable Boy)`);
      }
    },
  },
  // --- family ---------------------------------------------------------------
  {
    id: "occ_midwife",
    kind: "occupation",
    name: "Midwife",
    text: "After each family growth action you take, gain 2 food.",
    onAction: (ctx, spaceId) => {
      if (GROWTH_ACTIONS.includes(spaceId)) {
        ctx.player.resources.food += 2;
        ctx.emit("card", `${ctx.player.name} gains 2 food (Midwife)`);
      }
    },
  },
  {
    id: "occ_patriarch",
    kind: "occupation",
    name: "Patriarch",
    text: "End of game: 2 bonus points if your family has 5 members.",
    bonusVp: (p) => (p.family.length >= 5 ? 2 : 0),
  },
  // --- harvest engines ------------------------------------------------------
  {
    id: "occ_forager",
    kind: "occupation",
    name: "Forager",
    text: "At the start of each harvest, gain 1 food.",
    onHarvest: (ctx) => {
      ctx.player.resources.food += 1;
      ctx.emit("card", `${ctx.player.name} gains 1 food (Forager)`);
    },
  },
  {
    id: "occ_gleaner",
    kind: "occupation",
    name: "Gleaner",
    text: "At each harvest, gain 1 food for every 2 of your sown fields.",
    onHarvest: (ctx) => {
      const sown = ctx.player.spaces.filter((s) => s.kind === "field" && s.cropCount > 0).length;
      const food = Math.floor(sown / 2);
      if (food > 0) {
        ctx.player.resources.food += food;
        ctx.emit("card", `${ctx.player.name} gains ${food} food (Gleaner)`);
      }
    },
  },
  {
    id: "occ_milkman",
    kind: "occupation",
    name: "Milkman",
    text: "At each harvest, gain 1 food for every 2 cattle you have.",
    onHarvest: (ctx) => {
      const food = Math.floor(ctx.player.animals.cattle / 2);
      if (food > 0) {
        ctx.player.resources.food += food;
        ctx.emit("card", `${ctx.player.name} gains ${food} food (Milkman)`);
      }
    },
  },
  {
    id: "occ_cheesemaker",
    kind: "occupation",
    name: "Cheesemaker",
    text: "At each harvest, gain 1 food for every 3 sheep you have.",
    onHarvest: (ctx) => {
      const food = Math.floor(ctx.player.animals.sheep / 3);
      if (food > 0) {
        ctx.player.resources.food += food;
        ctx.emit("card", `${ctx.player.name} gains ${food} food (Cheesemaker)`);
      }
    },
  },
  {
    id: "occ_swine_keeper",
    kind: "occupation",
    name: "Swine Keeper",
    text: "At each harvest, gain 1 food for every 3 wild boar you have.",
    onHarvest: (ctx) => {
      const food = Math.floor(ctx.player.animals.boar / 3);
      if (food > 0) {
        ctx.player.resources.food += food;
        ctx.emit("card", `${ctx.player.name} gains ${food} food (Swine Keeper)`);
      }
    },
  },
  // --- round-start engines --------------------------------------------------
  {
    id: "occ_grain_steward",
    kind: "occupation",
    name: "Grain Steward",
    text: "When played, place 1 grain on each of the next 3 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 3); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "grain", count: 1 });
      }
    },
  },
  {
    id: "occ_water_carrier",
    kind: "occupation",
    name: "Water Carrier",
    text: "When played, place 1 food on each of the next 4 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 4); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "food", count: 1 });
      }
    },
  },
  {
    id: "occ_woodward",
    kind: "occupation",
    name: "Woodward",
    text: "When played, place 1 wood on each of the next 3 round spaces; collect them as those rounds begin.",
    onPlay: (ctx) => {
      for (let r = ctx.state.round + 1; r <= Math.min(14, ctx.state.round + 3); r++) {
        ctx.state.scheduled.push({ round: r, playerIdx: ctx.player.idx, good: "wood", count: 1 });
      }
    },
  },
  // --- one-time gains -------------------------------------------------------
  {
    id: "occ_vagrant",
    kind: "occupation",
    name: "Vagrant",
    text: "When played, gain 3 food.",
    onPlay: (ctx) => {
      ctx.player.resources.food += 3;
    },
  },
  {
    id: "occ_journeyman",
    kind: "occupation",
    name: "Journeyman",
    text: "When played, gain 1 wood, 1 clay and 1 reed.",
    onPlay: (ctx) => {
      ctx.player.resources.wood += 1;
      ctx.player.resources.clay += 1;
      ctx.player.resources.reed += 1;
    },
  },
  {
    id: "occ_seed_merchant",
    kind: "occupation",
    name: "Seed Merchant",
    text: "When played, gain 1 grain. Whenever you sow, gain 1 food.",
    onPlay: (ctx) => {
      ctx.player.resources.grain += 1;
    },
    onAction: (ctx, spaceId) => {
      if (spaceId === "r_sow_bake" || spaceId === "r_cultivation") {
        ctx.player.resources.food += 1;
        ctx.emit("card", `${ctx.player.name} gains 1 food (Seed Merchant)`);
      }
    },
  },
  {
    id: "occ_veg_peddler",
    kind: "occupation",
    name: "Vegetable Peddler",
    text: "When played, gain 1 vegetable.",
    prereq: { occupations: 1, label: "1 occupation" },
    onPlay: (ctx) => {
      ctx.player.resources.vegetable += 1;
    },
  },
  // --- bonus points ---------------------------------------------------------
  {
    id: "occ_schoolmaster",
    kind: "occupation",
    name: "Schoolmaster",
    text: "End of game: 1 bonus point for each occupation you played after this one.",
    bonusVp: (p) => {
      const idx = p.occupations.indexOf("occ_schoolmaster");
      return idx < 0 ? 0 : p.occupations.length - idx - 1;
    },
  },
  {
    id: "occ_elder",
    kind: "occupation",
    name: "Village Elder",
    text: "End of game: 1 bonus point for every 2 improvements you have in play.",
    bonusVp: (p) => Math.floor((p.minors.length + p.majors.length) / 2),
  },
  {
    id: "occ_surveyor",
    kind: "occupation",
    name: "Estate Surveyor",
    text: "End of game: 2 bonus points if your farmyard has no unused spaces.",
    bonusVp: (p) => {
      const layout = computePastures(p.spaces, p.fences);
      const unused = p.spaces.filter(
        (sp, i) => sp.kind === "empty" && !sp.stable && !layout.pastureCells.has(i),
      ).length;
      return unused === 0 ? 2 : 0;
    },
  },
  {
    id: "occ_animal_breeder",
    kind: "occupation",
    name: "Animal Breeder",
    text: "End of game: 1 bonus point for each animal type of which you have at least 6.",
    bonusVp: (p) =>
      (p.animals.sheep >= 6 ? 1 : 0) +
      (p.animals.boar >= 6 ? 1 : 0) +
      (p.animals.cattle >= 6 ? 1 : 0),
  },
  {
    id: "occ_master_builder",
    kind: "occupation",
    name: "Master Builder",
    text: "End of game: 2 bonus points if you have at least 5 rooms.",
    bonusVp: (p) => (p.spaces.filter((s) => s.kind === "room").length >= 5 ? 2 : 0),
  },
  {
    id: "occ_horticulturist",
    kind: "occupation",
    name: "Horticulturist",
    text: "End of game: 1 bonus point for every 2 fields you have.",
    bonusVp: (p) => Math.floor(p.spaces.filter((s) => s.kind === "field").length / 2),
  },
  // --- misc action triggers ---------------------------------------------------
  {
    id: "occ_compost_carter",
    kind: "occupation",
    name: "Compost Carter",
    text: "After each plow action you take, gain 1 food.",
    onAction: (ctx, spaceId) => {
      if (spaceId === "farmland" || spaceId === "r_cultivation") {
        ctx.player.resources.food += 1;
        ctx.emit("card", `${ctx.player.name} gains 1 food (Compost Carter)`);
      }
    },
  },
  {
    id: "occ_fence_hand",
    kind: "occupation",
    name: "Fence Hand",
    text: "After each fences action you take, gain 1 food.",
    onAction: (ctx, spaceId) => {
      if (spaceId === "r_fences" || spaceId === "r_redevelop") {
        ctx.player.resources.food += 1;
        ctx.emit("card", `${ctx.player.name} gains 1 food (Fence Hand)`);
      }
    },
  },
];
