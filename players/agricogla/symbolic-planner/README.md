# Agricogla Symbolic Planner

A deterministic, no-LLM policy for the `agricogla` 4-player worker-placement
Coworld. For each legal move it rolls the rest of the game out to round 14 under
a baseline continuation and picks the move with the best terminal score margin
(one-step policy improvement over the baseline).

- Policy name (uploaded): `agricogla-planner-fork`
- Player id: `players-agricogla-symbolic-planner`
- Game: `agricogla`
- Protocol: [`cogweb.player.v1`](../../../docs/coworld-player-packaging.md#game-specific-player-protocols)

This is a self-contained **fork** of the in-tree
`packages/cogweb/games/agricogla` planner player. It carries its own copy of the
game engine and planner source and has **no dependency on metta's `@cogweb/*`
packages**, so it builds and runs entirely from this directory.

## Strategy

The planner plans only on **observable** state. The host redacts each seat's
view — other farms' hands and the undealt round-card deck are masked with the
sentinel `"hidden"` — so a naive full-game rollout that reads hidden cards
crashes (`unknown card: hidden`). The fix is a `determinize` belief
(`src/planner/beliefs.ts`) that reconstructs the only legal guess of hidden
state (remaining round cards in stage order; opponents holding no private
cards) before any forward simulation.

- `src/planner/beliefs.ts` — typed belief model + determinization.
- `src/planner/tools.ts` — terminal value function + opponent-contention model.
- `src/planner/planner.ts` — the determinized rollout + argmax over candidates.
- `src/baseline.ts` — the always-legal baseline continuation (and the fallback
  used for non-planner seats in the smoke test).
- `src/engine/` — the pure game engine (state, cards, legal moves, scoring),
  copied verbatim from the source game.

## Runtime contract

This player ships as a self-contained Coworld player container:

- Reads `COWORLD_PLAYER_WS_URL` (engine endpoint + slot/token) from the
  environment, connects as a websocket **client** of the game host's `/player`
  endpoint, and speaks `cogweb.player.v1` (`welcome` / `observation` / `reply` /
  `final`).
- On each `observation` it decides a worker placement (work phase) or a feeding
  plan (feeding phase), keyed by `view.phase`, and replies with the same `id`.
- Exits when the game sends `final` or closes the socket.

`src/runtime/player-runtime.ts` is a minimal standalone implementation of that
loop over the `ws` library; `src/planner-player.ts` is the entry point.

## Build & artifacts

```bash
players/agricogla/symbolic-planner/build.sh
```

Produces:

- A `linux/amd64` Docker image tagged `players-agricogla-symbolic-planner:dev`
  (override with `--tag`).
- A `coworld_manifest.json` `player[]` snippet on stdout, optionally also
  written to `--manifest-out <path>`.
- `players/agricogla/symbolic-planner/dist/coplayer_manifest.json`.

Optional flags: `--push <registry-ref>` to re-tag and push, `--no-build` to
render manifests only.

## Local verification

```bash
npm install
npm run typecheck
npm run smoke      # full 4-player episode, seat 0 piloted by the planner over
                   # REDACTED views; asserts all 14 rounds complete with no crash
```

## Upload & submit

```bash
coworld upload-policy players-agricogla-symbolic-planner:dev \
  --name agricogla-planner-fork --run node --run planner-player.js
coworld submit agricogla-planner-fork --league <league_id> \
  --auto-champion always --no-open-browser
```

## Layout

```
symbolic-planner/
├── src/
│   ├── engine/             # pure game engine (verbatim copy)
│   ├── planner/            # belief model + rollout planner
│   ├── runtime/            # standalone cogweb.player.v1 websocket loop
│   ├── baseline.ts         # baseline continuation + view builder
│   └── planner-player.ts   # container entry point
├── smoke.ts                # local end-to-end smoke test
├── Dockerfile              # linux/amd64 player image
├── build.sh                # Coworld build entrypoint
└── README.md               # This file
```

## See also

- [`docs/coworld-player-packaging.md`](../../../docs/coworld-player-packaging.md)
  — Coworld player contract.
- `packages/cogweb/games/agricogla` (metta) — the source game + the in-tree
  planner this fork is derived from.
