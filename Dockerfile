# Immagine unica per init, web e worker (06 §4). Collaudata solo quando Docker è disponibile (DEC-100).
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production DATABASE_PATH=/data/inapp.db APP_ROOT=/app
COPY --from=build /app /app
RUN mkdir -p /data && chown -R node:node /data /app/.next
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
