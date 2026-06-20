FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY . .
RUN pnpm --filter @child-safe-llm/web build

# Run
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.output ./.output

# Migration toolchain: the Fly release_command (`pnpm db:push:ci`) runs in this
# image, so it needs the workspace manifests, the db package (schema +
# drizzle.config.ts), and the installed drizzle-kit toolchain. The app itself
# runs from the self-contained .output bundle above.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db ./packages/db
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
