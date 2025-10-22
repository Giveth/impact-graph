#https://hub.docker.com/_/node?tab=tags&page=1
FROM node:20.11.0-alpine3.18

WORKDIR /usr/src/app


COPY package*.json ./
COPY patches ./patches
COPY tsconfig.json .


RUN apk add --update alpine-sdk
RUN apk add git python3
RUN apk add --no-cache  chromium --repository=http://dl-cdn.alpinelinux.org/alpine/v3.18/main
RUN npm ci
RUN npm i -g ts-node

# When building docker images, docker caches the steps, so it's better to put the lines that would have lots of changes
# last, then when changing these steps the previous steps would use cache and move forward fast

COPY src ./src
COPY test ./test
COPY migration ./migration
COPY config ./config

RUN npm run build
