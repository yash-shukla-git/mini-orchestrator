FROM node:20-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package.json ./
COPY packages/worker/package.json ./packages/worker/

RUN npm install --workspace=packages/worker

COPY packages/worker ./packages/worker

WORKDIR /app/packages/worker

CMD ["npx", "tsx", "src/index.ts"]
