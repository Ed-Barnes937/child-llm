FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/pipeline/package.json ./apps/pipeline/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/pipeline/node_modules ./apps/pipeline/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY . .
WORKDIR /app/apps/pipeline
RUN npx tsc

# Run
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/pipeline/node_modules ./apps/pipeline/node_modules
COPY --from=build /app/apps/pipeline/dist ./dist
COPY apps/pipeline/package.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
