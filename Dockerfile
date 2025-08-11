FROM node:20-alpine AS base

# Install base OS deps used in all stages
RUN apk add --no-cache libc6-compat git

# ------------------------------------------------------------
# deps: install workspace dependencies with pnpm in a monorepo
# ------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Enable pnpm via Corepack
RUN corepack enable pnpm

# Copy lockfile and workspace manifest first for better caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Pre-copy package.json files from workspaces to leverage Docker layer cache
# This lets pnpm resolve the workspace graph without copying full sources yet
COPY apps/web/package.json apps/web/package.json
COPY packages/analyze-tracking/package.json packages/analyze-tracking/package.json

# Install all workspace deps; allow lockfile to reconcile workspace settings
RUN pnpm install --no-frozen-lockfile

# ------------------------------------------------------------
# builder: copy source and build only the web app (@aatx/web)
# ------------------------------------------------------------
FROM base AS builder
WORKDIR /app

RUN corepack enable pnpm

# Reuse node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy full source
COPY . .

# Ensure production env file exists at repo root, then make it available to the app
RUN [ -s .env.production ] || (echo ".env.production file missing or empty" && exit 1)
RUN mkdir -p apps/web && cp .env.production apps/web/.env.production

# Optionally disable Next telemetry during build
# ENV NEXT_TELEMETRY_DISABLED=1

# Build only the web app in the monorepo
RUN pnpm --filter @aatx/web build

# ------------------------------------------------------------
# runner: use Next.js standalone output (apps/web/.next/standalone)
# ------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1

# Optional global runtime tools (kept from original image)
RUN npm install -g @google/gemini-cli

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy Next standalone build and assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# In a monorepo, Next's standalone output nests server.js under the app path
WORKDIR /app
CMD ["node", "apps/web/server.js"]