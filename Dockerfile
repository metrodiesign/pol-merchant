FROM node:20-alpine AS deps
WORKDIR /app
# node:20-alpine ships npm 10.8.2, whose `npm ci` rejects this repo's (valid,
# npm-11-generated) lockfile on an optional-peer edge — bump npm before install.
RUN npm install -g npm@11.12.1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5300
ENV HOSTNAME="0.0.0.0"

COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir .next && chown node:node .next
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 5300

# node:20-alpine has no curl/wget by default — poll with Node itself instead.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5300/api/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
