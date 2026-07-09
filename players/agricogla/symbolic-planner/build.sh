#!/usr/bin/env bash
# Build the agricogla symbolic-planner player image and emit Coworld manifest
# artifacts. See ``docs/coworld-player-packaging.md`` for the full contract.
set -euo pipefail

SCRIPT_DIR="$( cd "$(dirname "${BASH_SOURCE[0]}")" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"
POLICY_DIR="$SCRIPT_DIR"
export POLICY_DIR

source "$REPO_ROOT/tools/players_build/build_lib.sh"

PLAYER_ID="agricogla-symbolic-planner"
PLAYER_NAME="Agricogla Symbolic Planner"
PLAYER_DESCRIPTION="Deterministic symbolic-planner policy for the agricogla 4-player Coworld: a determinized full-game rollout with a typed belief model, no LLM."
PLAYER_GAMES_JSON='["agricogla"]'
PLAYER_AUTHOR="players@softmax.com"
IMAGE_LOCAL_TAG="players-agricogla-symbolic-planner:dev"
IMAGE_PUBLIC_URI="ghcr.io/metta-ai/players-agricogla-symbolic-planner:latest"
DOCKERFILE="$POLICY_DIR/Dockerfile"
# Self-contained policy: the image only needs this leaf's own source, so the
# build context is the policy dir (not the repo root). The Dockerfile COPYs
# package.json/tsconfig.json/src from here.
BUILD_CONTEXT="$POLICY_DIR"
PLAYER_ENV_JSON='{}'
# The image's default CMD is the player, but encode the argv explicitly so the
# uploaded policy's `run` attribute is unambiguous.
PLAYER_RUN_JSON='["node", "planner-player.js"]'

run_player_build "$@"
