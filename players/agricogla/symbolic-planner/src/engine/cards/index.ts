import { CardDef } from "./types";
import { majors } from "./majors";
import { occupations } from "./occupations";
import { minors } from "./minors";

const registry = new Map<string, CardDef>();
for (const card of [...majors, ...occupations, ...minors]) {
  if (registry.has(card.id)) throw new Error(`duplicate card id: ${card.id}`);
  registry.set(card.id, card);
}

export function cardById(id: string): CardDef {
  const card = registry.get(id);
  if (!card) throw new Error(`unknown card: ${id}`);
  return card;
}

export function hasCard(id: string): boolean {
  return registry.has(id);
}

export const MAJOR_IDS = majors.map((c) => c.id);
export const OCCUPATION_IDS = occupations.map((c) => c.id);
export const MINOR_IDS = minors.map((c) => c.id);

export { majors, occupations, minors };
