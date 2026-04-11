FROM node:20-alpine AS builder

WORKDIR /backend

COPY package*.json ./
RUN npm install

COPY tsconfig.json rollup.config.js ./
COPY src/ src/

RUN npm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.25.0

COPY --from=builder /backend/build/index.js /nakama/data/modules/build/
COPY local.yml /nakama/data/local.yml
