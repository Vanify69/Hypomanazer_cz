# Backend API – bez build-time secrets (FRONTEND_URL a další jen za běhu)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Build bez reálných secrets – PostgreSQL schema pro produkční image
ENV DATABASE_URL="postgresql://localhost/build"
RUN npm run build

# Runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "scripts/start.sh"]
