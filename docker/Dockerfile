# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# ---- Dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ---- Build / typecheck ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm typecheck

# ---- Runtime: P2 Service Completion Phase B host (`pnpm start`) ----
FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV API_KEY=demo-key
ENV API_KEY_SUBJECT=demo-user
ENV WORKSPACE_ID=workspace-a
# InMemory + Fake LLM by default (no DATABASE_URL / OPENSEARCH_URL / LLM_API_KEY).

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY app ./app
COPY scripts ./scripts

EXPOSE 8080

# NodeHttpListener host (no Express). Optional Postgres/OpenSearch via env.
CMD ["pnpm", "start"]
