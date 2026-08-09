# syntax=docker/dockerfile:1

FROM node:22.19.0-alpine3.22 AS base
RUN npm install -g npm@11.12.1

# ---- deps: install dependencies only ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
# node:22-alpine bundles npm 10.9.3, which mis-validates fdir's OPTIONAL picomatch peer
# (peerDependenciesMeta.optional=true) during `npm ci` lockfile-sync check — it compares
# against the registry's current latest matching version instead of skipping the optional
# peer, so a correct lockfile is rejected (EUSAGE). npm 11.12.1 (the version that generated
# this lockfile) does not have this bug. Pinned exact, not floating.
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: build the app ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ไม่กำหนด MERCHANT_API_ORIGIN หรือ MERCHANT_SHELL_PREVIEW ตอน build/runtime:
# deployed environments ใช้ same-origin reverse proxy และปิด protected preview เสมอ.
ENV NODE_ENV=production
RUN npm run build

# ---- runner: minimal production image ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# permission ก่อน copy standalone — ให้ prerender/ISR cache เขียนได้ตอน runtime
RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
