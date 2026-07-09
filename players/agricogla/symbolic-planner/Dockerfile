# Agricogla symbolic-planner player image.
#
# Built via this leaf's ``build.sh``. The build context is the policy dir; the
# policy is self-contained (its own copy of the engine + planner source) and
# carries no dependency on metta's @cogweb/* packages.

FROM --platform=linux/amd64 node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ src/
RUN npx esbuild src/planner-player.ts --bundle --platform=node --target=node22 --format=esm --outfile=dist/planner-player.js --banner:js="import{createRequire}from'module';const require=createRequire(import.meta.url);"

FROM --platform=linux/amd64 node:22-slim
WORKDIR /app
COPY --from=build /app/dist/planner-player.js ./planner-player.js
CMD ["node", "planner-player.js"]
