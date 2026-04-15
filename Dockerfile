FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && \
    find /app/node_modules -type d -exec chmod 755 {} \; && \
    find /app/node_modules -type f -exec chmod 644 {} \;

FROM dhi.io/node:20-debian13

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.* ./

USER node

EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start"]