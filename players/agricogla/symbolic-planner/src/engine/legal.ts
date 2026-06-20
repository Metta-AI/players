import { spaceDef } from "./boards";
import { cardById } from "./cards";
import {
  foodNeeded,
  legalFieldSpaces,
  legalRoomSpaces,
  legalStableSpaces,
  renovationCost,
  roomCost,
} from "./apply";
import { bestCookRate, playedCards } from "./effects";
import { computePastures, edgesOfCell, validateFencePlan } from "./farmyard";
import { COLS, GameState, Goods, PlayerState, ROWS, Resource, spaceIndex } from "./types";

export interface ActionOption {
  id: string;
  title: string;
  summary: string;
  pile: Goods;
  occupiedBy: number | null;
  available: boolean;
  reason?: string;
}

export interface CardOption {
  id: string;
  name: string;
  cost: Goods;
  vp: number;
  text: string;
  affordable: boolean;
  prereqOk: boolean;
  prereqLabel?: string;
}

export interface FencePlan {
  edges: string[];
  cost: number;
  cells: number[];
}

export interface BakeOption {
  card: string;
  name: string;
  perGrain: number;
  maxGrain: number;
}

export interface ConversionOption {
  via: string;
  name: string;
  good: string;
  foodEach: number;
  max: number;
}

/** Everything a player (human UI or agent) needs to compose a placement. */
export interface PlayerChoices {
  roomCost: Goods;
  renovation: Goods | null;
  legalRooms: number[];
  legalFields: number[];
  legalStables: number[];
  stablesLeft: number;
  occupationCostBySpace: Record<string, number>;
  handOccupations: CardOption[];
  handMinors: CardOption[];
  majors: CardOption[];
  fencePlans: FencePlan[];
  sowableFields: number[];
  bakeOptions: BakeOption[];
  familyGrowthOk: boolean;
  urgentGrowthOk: boolean;
  foodNeededNow: number;
  conversionOptions: ConversionOption[];
}

function affordable(player: PlayerState, cost: Goods): boolean {
  return Object.entries(cost).every(
    ([res, n]) => player.resources[res as Resource] >= (n ?? 0),
  );
}

function cardOption(state: GameState, player: PlayerState, id: string): CardOption {
  const card = cardById(id);
  let prereqOk = true;
  if (card.prereq) {
    if (card.prereq.occupations !== undefined) {
      prereqOk = player.occupations.length >= card.prereq.occupations;
    }
    if (prereqOk && card.prereq.check) prereqOk = card.prereq.check(player, state);
  }
  return {
    id,
    name: card.name,
    cost: card.cost ?? {},
    vp: card.vp ?? 0,
    text: card.text,
    affordable: affordable(player, card.cost ?? {}),
    prereqOk,
    prereqLabel: card.prereq?.label,
  };
}

/** Candidate rectangular pastures (plus single-cell plans) for agents. The UI
 *  lets humans draw arbitrary fence sets; these are suggestions, not limits. */
export function suggestFencePlans(player: PlayerState): FencePlan[] {
  const layout = computePastures(player.spaces, player.fences);
  const plans: FencePlan[] = [];
  for (let r1 = 0; r1 < ROWS; r1++) {
    for (let r2 = r1; r2 < ROWS; r2++) {
      for (let c1 = 0; c1 < COLS; c1++) {
        for (let c2 = c1; c2 < COLS; c2++) {
          const cells: number[] = [];
          let ok = true;
          for (let r = r1; r <= r2 && ok; r++) {
            for (let c = c1; c <= c2 && ok; c++) {
              const i = spaceIndex(r, c);
              const sp = player.spaces[i]!;
              if (sp.kind !== "empty" || layout.pastureCells.has(i)) ok = false;
              else cells.push(i);
            }
          }
          if (!ok || cells.length === 0 || cells.length > 6) continue;
          const existing = new Set(player.fences);
          const edgeCount = new Map<string, number>();
          for (const cell of cells) {
            for (const e of edgesOfCell(cell)) {
              edgeCount.set(e, (edgeCount.get(e) ?? 0) + 1);
            }
          }
          // Perimeter edges appear once; interior edges twice (left open).
          const edges = [...edgeCount.entries()]
            .filter(([e, n]) => n === 1 && !existing.has(e))
            .map(([e]) => e);
          if (edges.length === 0) continue;
          const result = validateFencePlan(player, edges);
          if (!result.ok) continue;
          plans.push({ edges, cost: edges.length, cells });
        }
      }
    }
  }
  plans.sort((a, b) => a.cost - b.cost || b.cells.length - a.cells.length);
  return plans.slice(0, 24);
}

export function playerChoices(state: GameState, playerIdx: number): PlayerChoices {
  const player = state.players[playerIdx]!;
  let renovation: Goods | null = null;
  if (player.houseMaterial !== "stone") {
    renovation = renovationCost(player);
  }
  const rooms = player.spaces.filter((s) => s.kind === "room").length;
  const stablesBuilt = player.spaces.filter((s) => s.stable).length;

  const occupationCostBySpace: Record<string, number> = {
    lessons: player.occupations.length === 0 ? 0 : 1,
    lessons_b:
      state.numPlayers === 3 ? 2 : player.occupations.length < 2 ? 1 : 2,
  };

  const bakeOptions: BakeOption[] = [];
  for (const card of playedCards(player)) {
    if (card.bake) {
      bakeOptions.push({
        card: card.id,
        name: card.name,
        perGrain: card.bake.perGrain,
        maxGrain: card.bake.maxGrain,
      });
    }
  }

  const conversionOptions: ConversionOption[] = [];
  if (player.resources.grain > 0) {
    conversionOptions.push({
      via: "raw",
      name: "Raw grain",
      good: "grain",
      foodEach: 1,
      max: player.resources.grain,
    });
  }
  if (player.resources.vegetable > 0) {
    conversionOptions.push({
      via: "raw",
      name: "Raw vegetable",
      good: "vegetable",
      foodEach: 1,
      max: player.resources.vegetable,
    });
  }
  for (const type of ["sheep", "boar", "cattle"] as const) {
    const cook = bestCookRate(player, type);
    if (cook && player.animals[type] > 0) {
      conversionOptions.push({
        via: cook.card.id,
        name: cook.card.name,
        good: type,
        foodEach: cook.food,
        max: player.animals[type],
      });
    }
  }
  for (const card of playedCards(player)) {
    if (card.cook?.vegetable && player.resources.vegetable > 0) {
      conversionOptions.push({
        via: card.id,
        name: card.name,
        good: "vegetable",
        foodEach: card.cook.vegetable,
        max: player.resources.vegetable,
      });
    }
    if (card.harvestFood && state.phase === "feeding") {
      const have = player.resources[card.harvestFood.from];
      const used = player.cardData[card.id]?.harvestUsed ?? 0;
      const max = Math.min(card.harvestFood.max - used, have);
      if (max > 0) {
        conversionOptions.push({
          via: card.id,
          name: card.name,
          good: card.harvestFood.from,
          foodEach: card.harvestFood.food,
          max,
        });
      }
    }
  }

  return {
    roomCost: roomCost(player),
    renovation,
    legalRooms: legalRoomSpaces(player),
    legalFields: legalFieldSpaces(player),
    legalStables: legalStableSpaces(player),
    stablesLeft: 4 - stablesBuilt,
    occupationCostBySpace,
    handOccupations: player.handOccupations.map((id) => cardOption(state, player, id)),
    handMinors: player.handMinors.map((id) => cardOption(state, player, id)),
    majors: state.majorsAvailable.map((id) => cardOption(state, player, id)),
    fencePlans: suggestFencePlans(player),
    sowableFields: player.spaces
      .map((_, i) => i)
      .filter((i) => player.spaces[i]!.kind === "field" && player.spaces[i]!.cropCount === 0),
    bakeOptions,
    familyGrowthOk: player.family.length < 5 && rooms > player.family.length,
    urgentGrowthOk: player.family.length < 5,
    foodNeededNow: foodNeeded(state, player),
    conversionOptions,
  };
}

/** Availability of each action space for the current player. */
export function legalActions(state: GameState, playerIdx: number): ActionOption[] {
  const player = state.players[playerIdx]!;
  const choices = playerChoices(state, playerIdx);
  return state.actionSpaces.map((space) => {
    const def = spaceDef(space.id, state.numPlayers);
    let available = state.phase === "work" && space.occupiedBy === null;
    let reason: string | undefined;
    const no = (why: string) => {
      available = false;
      reason = why;
    };
    if (available) {
      switch (space.id) {
        case "farm_expansion": {
          const roomOk = choices.legalRooms.length > 0 && affordable(player, choices.roomCost);
          const stableOk =
            choices.stablesLeft > 0 &&
            choices.legalStables.length > 0 &&
            player.resources.wood >= 2;
          if (!roomOk && !stableOk) no("cannot afford a room or stable");
          break;
        }
        case "farmland":
          if (choices.legalFields.length === 0) no("no legal field space");
          break;
        case "lessons":
        case "lessons_b": {
          const cost = choices.occupationCostBySpace[space.id] ?? 0;
          const playable = choices.handOccupations.filter(
            (c) => c.prereqOk && player.resources.food >= cost,
          );
          if (playable.length === 0) no("no playable occupation");
          break;
        }
        case "r_improvement": {
          const minorOk = choices.handMinors.some((c) => c.affordable && c.prereqOk);
          const majorOk = choices.majors.some(
            (c) =>
              c.affordable ||
              ((c.id === "hearth4" || c.id === "hearth5") &&
                player.majors.some((m) => m === "fireplace2" || m === "fireplace3")),
          );
          if (!minorOk && !majorOk) no("no playable improvement");
          break;
        }
        case "r_fences":
          if (choices.fencePlans.length === 0 || player.resources.wood < choices.fencePlans[0]!.cost) {
            no("no affordable fence plan");
          }
          break;
        case "r_sow_bake": {
          const canSow =
            choices.sowableFields.length > 0 &&
            (player.resources.grain > 0 || player.resources.vegetable > 0);
          const canBake = choices.bakeOptions.length > 0 && player.resources.grain > 0;
          if (!canSow && !canBake) no("nothing to sow or bake");
          break;
        }
        case "r_renovate_improve":
        case "r_redevelop":
          if (!choices.renovation || !affordable(player, choices.renovation)) {
            no("cannot afford renovation");
          }
          break;
        case "r_family_growth":
          if (!choices.familyGrowthOk) no("no free room (or family already 5)");
          break;
        case "r_urgent_family":
          if (!choices.urgentGrowthOk) no("family already 5");
          break;
        case "r_cultivation": {
          const canPlow = choices.legalFields.length > 0;
          const canSow =
            choices.sowableFields.length > 0 &&
            (player.resources.grain > 0 || player.resources.vegetable > 0);
          if (!canPlow && !canSow) no("nothing to plow or sow");
          break;
        }
        default:
          break;
      }
    } else if (space.occupiedBy !== null) {
      reason = `occupied by ${state.players[space.occupiedBy]!.name}`;
    }
    return {
      id: space.id,
      title: def.title,
      summary: def.summary,
      pile: space.pile,
      occupiedBy: space.occupiedBy,
      available,
      reason,
    };
  });
}
