# Medusa backend for Railway/Render (monorepo-aware).
# Builder: Dockerfile | Path: Dockerfile | Context: repo root
# Set NPM_TOKEN in service variables if npm rate-limits (429).

FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}
# Keep devDependencies available for `medusa build` (typescript/vite).
ENV NPM_CONFIG_PRODUCTION=false

# Copy manifests + backend source BEFORE npm ci.
# Copying apps/backend after install wipes nested workspace packages
# (e.g. @medusajs/auth-emailpass) and breaks Auth/Fulfillment loaders.
COPY package.json package-lock.json .npmrc turbo.json ./
COPY apps/backend ./apps/backend
COPY apps/storefront/package.json ./apps/storefront/package.json

# Retry — Medusa installs are large and npm can 429 on shared IPs.
RUN set -e; \
  for i in 1 2 3 4 5 6; do \
    echo "npm ci attempt $i..."; \
    npm ci --prefer-offline --no-audit --maxsockets=2 \
      --workspace=@dtc/backend --include-workspace-root && exit 0; \
    echo "npm ci failed (attempt $i). Waiting before retry..."; \
    sleep $((i * 20)); \
  done; \
  echo "npm ci failed after retries"; \
  exit 1

RUN npm run build --workspace=@dtc/backend

# Fail the image early if providers cannot resolve from the app cwd.
WORKDIR /app/apps/backend
RUN node -e "require.resolve('@medusajs/medusa/auth-emailpass'); require.resolve('@medusajs/auth-emailpass'); require.resolve('@medusajs/medusa/fulfillment-manual'); console.log('medusa providers ok')"

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
# Railway injects PORT at runtime; 9000 is only a local default.
ENV PORT=9000

COPY --from=build /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 9000

# --skip-links avoids monorepo link-planner crash; module migrations (rbac_*) still run.
CMD ["sh", "-c", "npx medusa db:migrate --skip-links && npx medusa start"]
