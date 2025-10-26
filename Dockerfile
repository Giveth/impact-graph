# https://hub.docker.com/_/node?tab=tags&page=1
# Build stage
FROM node:20.11.0-alpine3.18 AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY patches ./patches
COPY tsconfig.json .

# Combine RUN commands to reduce layers
RUN apk add --update --no-cache \
    alpine-sdk \
    git \
    python3 \
    chromium --repository=http://dl-cdn.alpinelinux.org/alpine/v3.18/main && \
    npm ci && \
    npm i -g ts-node

# When building docker images, docker caches the steps, so it's better to put the lines that would have lots of changes
# last, then when changing these steps the previous steps would use cache and move forward fast

COPY src ./src
COPY test ./test
COPY migration ./migration

RUN npm run build && npm prune --omit=dev

# Production stage
FROM node:20.11.0-alpine3.18

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Add non-root user for security before copying files with ownership
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy built files from builder stage (assign ownership to non-root user)
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/build ./build
COPY --chown=nodejs:nodejs migration ./migration

USER nodejs
