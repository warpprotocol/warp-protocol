FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
