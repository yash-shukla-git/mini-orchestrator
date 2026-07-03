FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./
COPY packages/core/package.json ./packages/core/

RUN npm install --workspace=packages/core

COPY packages/core ./packages/core

WORKDIR /app/packages/core

CMD ["npx", "tsx", "src/index.ts"]
