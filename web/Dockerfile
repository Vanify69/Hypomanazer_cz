FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src

ARG VITE_API_URL
ARG VITE_APP_URL

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g serve@14

COPY --from=builder /app/build ./build

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "serve -s build -l ${PORT}"]
