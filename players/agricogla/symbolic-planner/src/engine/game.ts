import { boardSpaces, buildRoundDeck } from "./boards";
import { MAJOR_IDS, MINOR_IDS, OCCUPATION_IDS } from "./cards";
import { makeRng, randInt, shuffled } from "./rng";
import { emit } from "./effects";
import { startRound } from "./apply";
import {
  FarmSpace,
  GameState,
  NUM_SPACES,
  PlayerState,
  emptyGoods,
  spaceIndex,
} from "./types";

export const PLAYER_COLORS = ["#7a4d8f", "#2e6b34", "#27557d", "#a03a2e"] as const;
export const DEFAULT_NAMES = ["Anna", "Bram", "Carla", "Diederik"] as const;

function freshFarm(): FarmSpace[] {
  const spaces: FarmSpace[] = [];
  for (let i = 0; i < NUM_SPACES; i++) {
    spaces.push({ kind: "empty", stable: false, crop: null, cropCount: 0 });
  }
  // The starting wooden hut: middle-left and bottom-left spaces.
  spaces[spaceIndex(1, 0)]!.kind = "room";
  spaces[spaceIndex(2, 0)]!.kind = "room";
  return spaces;
}

export interface NewGameOptions {
  seed: number;
  numPlayers: number;
  names?: string[];
}

export function newGame(opts: NewGameOptions): GameState {
  const { seed, numPlayers } = opts;
  if (numPlayers < 1 || numPlayers > 4) throw new Error("supported player counts: 1-4");
  const rng = makeRng(seed);
  const solo = numPlayers === 1;

  const occupationDeck = shuffled(rng, OCCUPATION_IDS);
  const minorDeck = shuffled(rng, MINOR_IDS);

  const players: PlayerState[] = [];
  for (let idx = 0; idx < numPlayers; idx++) {
    players.push({
      idx,
      name: opts.names?.[idx] ?? DEFAULT_NAMES[idx]!,
      color: PLAYER_COLORS[idx]!,
      resources: { ...emptyGoods(), food: 0 } as PlayerState["resources"],
      animals: { sheep: 0, boar: 0, cattle: 0 },
      spaces: freshFarm(),
      fences: [],
      fencesBuilt: 0,
      houseMaterial: "wood",
      family: [
        { bornRound: 0, placed: false },
        { bornRound: 0, placed: false },
      ],
      beggingCards: 0,
      startingPlayerMarker: false,
      handOccupations: occupationDeck.splice(0, 7),
      handMinors: minorDeck.splice(0, 7),
      occupations: [],
      minors: [],
      majors: [],
      cardData: {},
    });
  }

  const startingPlayer = randInt(rng, numPlayers);
  for (const [i, p] of players.entries()) {
    p.startingPlayerMarker = i === startingPlayer;
    p.resources.food = solo ? 0 : i === startingPlayer ? 2 : 3;
  }

  const state: GameState = {
    seed,
    numPlayers,
    solo,
    round: 0,
    phase: "work",
    startingPlayer,
    currentPlayer: startingPlayer,
    toFeed: [],
    actionSpaces: boardSpaces(numPlayers).map((d) => ({ id: d.id, occupiedBy: null, pile: {} })),
    roundDeck: buildRoundDeck(rng),
    majorsAvailable: [...MAJOR_IDS],
    scheduled: [],
    players,
    log: [],
    scores: null,
  };
  emit(state, null, "setup", `New ${numPlayers}-player game (seed ${seed})`);
  startRound(state);
  return state;
}
