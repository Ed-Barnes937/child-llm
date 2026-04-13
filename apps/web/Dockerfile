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
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
