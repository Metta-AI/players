import {
  ANIMALS,
  AnimalType,
  COLS,
  EdgeId,
  FarmSpace,
  NUM_SPACES,
  PlayerState,
  ROWS,
  colOf,
  rowOf,
  spaceIndex,
} from "./types";

/** Horizontal edge above row r (r 0..ROWS) at column c. */
export function hEdge(r: number, c: number): EdgeId {
  return `h-${r}-${c}`;
}

/** Vertical edge left of column c (c 0..COLS) at row r. */
export function vEdge(r: number, c: number): EdgeId {
  return `v-${r}-${c}`;
}

export function allEdges(): EdgeId[] {
  const out: EdgeId[] = [];
  for (let r = 0; r <= ROWS; r++) for (let c = 0; c < COLS; c++) out.push(hEdge(r, c));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS; c++) out.push(vEdge(r, c));
  return out;
}

export function isValidEdge(e: EdgeId): boolean {
  const m = /^([hv])-(\d+)-(\d+)$/.exec(e);
  if (!m) return false;
  const r = Number(m[2]);
  const c = Number(m[3]);
  if (m[1] === "h") return r >= 0 && r <= ROWS && c >= 0 && c < COLS;
  return r >= 0 && r < ROWS && c >= 0 && c <= COLS;
}

/** The four edges around a cell. */
export function edgesOfCell(space: number): EdgeId[] {
  const r = rowOf(space);
  const c = colOf(space);
  return [hEdge(r, c), hEdge(r + 1, c), vEdge(r, c), vEdge(r, c + 1)];
}

/** Cells on each side of an edge; null = outside the farmyard. */
export function cellsOfEdge(e: EdgeId): [number | null, number | null] {
  const m = /^([hv])-(\d+)-(\d+)$/.exec(e);
  if (!m) throw new Error(`bad edge id: ${e}`);
  const r = Number(m[2]);
  const c = Number(m[3]);
  if (m[1] === "h") {
    const above = r - 1 >= 0 ? spaceIndex(r - 1, c) : null;
    const below = r < ROWS ? spaceIndex(r, c) : null;
    return [above, below];
  }
  const left = c - 1 >= 0 ? spaceIndex(r, c - 1) : null;
  const right = c < COLS ? spaceIndex(r, c) : null;
  return [left, right];
}

export function neighborsOf(space: number): number[] {
  const r = rowOf(space);
  const c = colOf(space);
  const out: number[] = [];
  if (r > 0) out.push(spaceIndex(r - 1, c));
  if (r < ROWS - 1) out.push(spaceIndex(r + 1, c));
  if (c > 0) out.push(spaceIndex(r, c - 1));
  if (c < COLS - 1) out.push(spaceIndex(r, c + 1));
  return out;
}

export interface Pasture {
  cells: number[];
  stables: number;
  capacity: number;
}

export interface PastureLayout {
  pastures: Pasture[];
  /** Spaces that belong to some pasture. */
  pastureCells: Set<number>;
}

/** Compute enclosed regions given the fence set. Regions connected to the
 *  exterior (through any unfenced border or unfenced inner edge chain) are not
 *  enclosed. */
export function computePastures(spaces: FarmSpace[], fences: EdgeId[]): PastureLayout {
  const fenceSet = new Set(fences);
  const EXTERIOR = -1;
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let cur = x;
    while (parent.get(cur) !== cur) {
      const next = parent.get(cur)!;
      parent.set(cur, r);
      cur = next;
    }
    return r;
  };
  const union = (a: number, b: number) => {
    parent.set(find(a), find(b));
  };
  parent.set(EXTERIOR, EXTERIOR);
  for (let i = 0; i < NUM_SPACES; i++) parent.set(i, i);

  for (const e of allEdges()) {
    if (fenceSet.has(e)) continue;
    const [a, b] = cellsOfEdge(e);
    union(a ?? EXTERIOR, b ?? EXTERIOR);
  }

  const regions = new Map<number, number[]>();
  for (let i = 0; i < NUM_SPACES; i++) {
    const root = find(i);
    if (root === find(EXTERIOR)) continue;
    const list = regions.get(root) ?? [];
    list.push(i);
    regions.set(root, list);
  }

  const pastures: Pasture[] = [];
  const pastureCells = new Set<number>();
  for (const cells of regions.values()) {
    const stables = cells.filter((c) => spaces[c]!.stable).length;
    pastures.push({
      cells: cells.sort((a, b) => a - b),
      stables,
      capacity: 2 * cells.length * 2 ** stables,
    });
    for (const c of cells) pastureCells.add(c);
  }
  pastures.sort((a, b) => a.cells[0]! - b.cells[0]!);
  return { pastures, pastureCells };
}

export interface FencePlanResult {
  ok: boolean;
  error?: string;
  layout?: PastureLayout;
}

/** Validate adding `newEdges` to the player's fences (rules 5.5). */
export function validateFencePlan(player: PlayerState, newEdges: EdgeId[]): FencePlanResult {
  if (newEdges.length === 0) return { ok: false, error: "must build at least 1 fence" };
  const existing = new Set(player.fences);
  const seen = new Set<string>();
  for (const e of newEdges) {
    if (!isValidEdge(e)) return { ok: false, error: `invalid fence edge ${e}` };
    if (existing.has(e)) return { ok: false, error: `fence already built at ${e}` };
    if (seen.has(e)) return { ok: false, error: `duplicate fence ${e}` };
    seen.add(e);
  }
  if (player.fencesBuilt + newEdges.length > 15) {
    return { ok: false, error: "fence limit is 15 per player" };
  }

  const before = computePastures(player.spaces, player.fences);
  const fences = [...player.fences, ...newEdges];
  const layout = computePastures(player.spaces, fences);

  for (const p of layout.pastures) {
    for (const c of p.cells) {
      const sp = player.spaces[c]!;
      if (sp.kind !== "empty") {
        return { ok: false, error: `${sp.kind} at space ${c} may not be fenced in` };
      }
    }
  }
  // Every fence must border an enclosed pasture cell.
  for (const e of fences) {
    const [a, b] = cellsOfEdge(e);
    const borders =
      (a !== null && layout.pastureCells.has(a)) || (b !== null && layout.pastureCells.has(b));
    if (!borders) {
      return { ok: false, error: `fence ${e} is not part of any enclosed pasture` };
    }
  }
  // New pastures must border existing ones (if any existed).
  if (before.pastures.length > 0) {
    for (const p of layout.pastures) {
      const overlapsOld = p.cells.some((c) => before.pastureCells.has(c));
      if (overlapsOld) continue;
      const touchesOld = p.cells.some((c) =>
        neighborsOf(c).some((n) => before.pastureCells.has(n)),
      );
      if (!touchesOld) {
        return { ok: false, error: "new pastures must border existing pastures" };
      }
    }
  }
  return { ok: true, layout };
}

/** Extra animal capacity granted by cards: `type` undefined = any one type. */
export interface CapacitySlot {
  type?: AnimalType;
  capacity: number;
}

export interface AnimalHolding {
  retained: Record<AnimalType, number>;
  total: number;
}

/** Maximum animals retainable given farm layout + card slots. Pastures hold a
 *  single type each; the house holds 1 pet; unfenced stables hold 1 each. */
export function maxRetention(
  player: PlayerState,
  counts: Record<AnimalType, number>,
  cardSlots: CapacitySlot[],
): AnimalHolding {
  const layout = computePastures(player.spaces, player.fences);
  const unfencedStables = player.spaces.filter(
    (sp, i) => sp.stable && sp.kind === "empty" && !layout.pastureCells.has(i),
  ).length;

  // Typed slots fill first (they can't be repurposed).
  const typedExtra: Record<AnimalType, number> = { sheep: 0, boar: 0, cattle: 0 };
  let anySlots: number[] = [];
  for (const s of cardSlots) {
    if (s.type) typedExtra[s.type] += s.capacity;
    else anySlots.push(s.capacity);
  }
  // House pet + each unfenced stable: capacity-1 any-type slots.
  anySlots = anySlots.concat([1], Array(unfencedStables).fill(1));

  const caps = layout.pastures.map((p) => p.capacity);
  let best: AnimalHolding = { retained: { sheep: 0, boar: 0, cattle: 0 }, total: 0 };
  const nAssign = layout.pastures.length;
  const options: (AnimalType | null)[] = [null, ...ANIMALS];

  const assign = new Array<AnimalType | null>(nAssign).fill(null);
  const evaluate = () => {
    const pastureCap: Record<AnimalType, number> = { sheep: 0, boar: 0, cattle: 0 };
    for (let i = 0; i < nAssign; i++) {
      const t = assign[i];
      if (t) pastureCap[t] += caps[i]!;
    }
    const leftover: Record<AnimalType, number> = { sheep: 0, boar: 0, cattle: 0 };
    const retained: Record<AnimalType, number> = { sheep: 0, boar: 0, cattle: 0 };
    for (const t of ANIMALS) {
      retained[t] = Math.min(counts[t], pastureCap[t] + typedExtra[t]);
      leftover[t] = counts[t] - retained[t];
    }
    // Distribute any-type slots: each holds animals of one type, biggest first.
    const slots = [...anySlots].sort((a, b) => b - a);
    for (const cap of slots) {
      let bestType: AnimalType | null = null;
      for (const t of ANIMALS) {
        if (leftover[t] > 0 && (bestType === null || leftover[t] > leftover[bestType])) {
          bestType = t;
        }
      }
      if (!bestType) break;
      const take = Math.min(cap, leftover[bestType]);
      retained[bestType] += take;
      leftover[bestType] -= take;
    }
    const total = ANIMALS.reduce((s, t) => s + retained[t], 0);
    if (total > best.total) best = { retained, total };
  };

  const recurse = (i: number) => {
    if (i === nAssign) {
      evaluate();
      return;
    }
    for (const opt of options) {
      assign[i] = opt;
      recurse(i + 1);
    }
  };
  recurse(0);
  return best;
}
