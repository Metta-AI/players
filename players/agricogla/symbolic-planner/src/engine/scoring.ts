import { cardById } from "./cards";
import { computePastures } from "./farmyard";
import { GameState, PlayerState, ScoreCategory, ScoreSheet } from "./types";

function tiered(count: number, tiers: [number, number][], negativeBelow: number): number {
  if (count < negativeBelow) return -1;
  let pts = 0;
  for (const [threshold, points] of tiers) if (count >= threshold) pts = points;
  return pts;
}

export function scorePlayer(state: GameState, player: PlayerState): ScoreSheet {
  const categories: ScoreCategory[] = [];
  const add = (label: string, points: number, detail: string) => {
    categories.push({ label, points, detail });
  };

  const fields = player.spaces.filter((s) => s.kind === "field").length;
  add(
    "Fields",
    tiered(fields, [[2, 1], [3, 2], [4, 3], [5, 4]], 2),
    `${fields} field(s)`,
  );

  const layout = computePastures(player.spaces, player.fences);
  const pastures = layout.pastures.length;
  add(
    "Pastures",
    tiered(pastures, [[1, 1], [2, 2], [3, 3], [4, 4]], 1),
    `${pastures} pasture(s)`,
  );

  const grain =
    player.resources.grain +
    player.spaces.reduce((s, sp) => s + (sp.crop === "grain" ? sp.cropCount : 0), 0);
  add("Grain", tiered(grain, [[1, 1], [4, 2], [6, 3], [8, 4]], 1), `${grain} grain`);

  const veg =
    player.resources.vegetable +
    player.spaces.reduce((s, sp) => s + (sp.crop === "vegetable" ? sp.cropCount : 0), 0);
  add("Vegetables", tiered(veg, [[1, 1], [2, 2], [3, 3], [4, 4]], 1), `${veg} vegetable(s)`);

  add(
    "Sheep",
    tiered(player.animals.sheep, [[1, 1], [4, 2], [6, 3], [8, 4]], 1),
    `${player.animals.sheep} sheep`,
  );
  add(
    "Wild boar",
    tiered(player.animals.boar, [[1, 1], [3, 2], [5, 3], [7, 4]], 1),
    `${player.animals.boar} wild boar`,
  );
  add(
    "Cattle",
    tiered(player.animals.cattle, [[1, 1], [2, 2], [4, 3], [6, 4]], 1),
    `${player.animals.cattle} cattle`,
  );

  const unused = player.spaces.filter(
    (sp, i) => sp.kind === "empty" && !sp.stable && !layout.pastureCells.has(i),
  ).length;
  add("Unused spaces", -unused, `${unused} unused space(s)`);

  const fencedStables = player.spaces.filter(
    (sp, i) => sp.stable && layout.pastureCells.has(i),
  ).length;
  add("Fenced stables", fencedStables, `${fencedStables} fenced stable(s)`);

  const rooms = player.spaces.filter((s) => s.kind === "room").length;
  const roomPts = player.houseMaterial === "clay" ? rooms : player.houseMaterial === "stone" ? rooms * 2 : 0;
  add("Rooms", roomPts, `${rooms} ${player.houseMaterial} room(s)`);

  add("Family", player.family.length * 3, `${player.family.length} family member(s)`);
  add("Begging", -3 * player.beggingCards, `${player.beggingCards} begging card(s)`);

  let cardPts = 0;
  let bonusPts = 0;
  for (const id of [...player.occupations, ...player.minors, ...player.majors]) {
    const card = cardById(id);
    cardPts += card.vp ?? 0;
    bonusPts += card.bonusVp ? card.bonusVp(player, state) : 0;
  }
  add("Card points", cardPts, "printed victory points");
  add("Bonus points", bonusPts, "card bonus points");

  const total = categories.reduce((s, c) => s + c.points, 0);
  return { playerIdx: player.idx, categories, total };
}

export function scoreGame(state: GameState): ScoreSheet[] {
  return state.players.map((p) => scorePlayer(state, p));
}
