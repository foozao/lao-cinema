# Multi-stage build for Fastify API
# Build context should be project root to access /db directory
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY api/package.json ./
RUN npm install --only=production

# Build stage
FROM base AS builder
WORKDIR /app
COPY api/package.json ./
RUN npm install
# Copy API source
COPY api/src ./src
COPY api/tsconfig.json ./tsconfig.json
# Copy db schema directly into src/db/ (replacing the re-export)
COPY db/src/schema.ts ./src/db/schema.ts
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy built application and dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER fastify

EXPOSE 8080

ENV HOST=0.0.0.0

# Start Fastify server
CMD ["node", "dist/index.js"]
