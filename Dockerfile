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
ENV NPM_CONFIG_PRODUCTION=false

# Copy manifests + backend source BEFORE npm ci (never wipe nested workspace pkgs).
COPY package.json package-lock.json .npmrc turbo.json ./
COPY apps/backend ./apps/backend
COPY apps/storefront/package.json ./apps/storefront/package.json

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

# Lockfile nests providers under apps/backend/node_modules, while @medusajs/medusa
# often resolves from /app/node_modules. Hoist providers so require() from medusa works.
RUN set -e; \
  mkdir -p /app/node_modules/@medusajs; \
  for pkg in auth-emailpass fulfillment-manual link-modules file-local \
             auth auth-github auth-google fulfillment file; do \
    src="/app/apps/backend/node_modules/@medusajs/$pkg"; \
    dest="/app/node_modules/@medusajs/$pkg"; \
    if [ -e "$src" ] && [ ! -e "$dest" ]; then \
      ln -s "../../../apps/backend/node_modules/@medusajs/$pkg" "$dest"; \
      echo "hoisted @medusajs/$pkg"; \
    fi; \
  done

RUN npm run build --workspace=@dtc/backend

# Actual require() (not just resolve) — matches Medusa's runtime loader.
WORKDIR /app/apps/backend
RUN node -e "require('@medusajs/medusa/auth-emailpass'); require('@medusajs/medusa/fulfillment-manual'); console.log('medusa providers ok')"

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=9000
# Fallback so nested workspace packages stay visible if medusa loads from root.
ENV NODE_PATH=/app/apps/backend/node_modules:/app/node_modules

COPY --from=build /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 9000

CMD ["sh", "-c", "npx medusa db:migrate --skip-links && npx medusa start"]
