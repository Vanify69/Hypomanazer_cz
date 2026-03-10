# Frontend-only build (obchází Railpack a jeho vyžadování VITE_API_URL).
# Použije se jen u služby, která má Root Directory = kořen repa (React frontend).

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g serve@14

COPY --from=builder /app/build ./build

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "serve -s build -l ${PORT}"]
