FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY ingestor/package.json ./ingestor/

RUN npm install --omit=dev --workspaces --include-workspace-root

COPY shared ./shared
COPY ingestor ./ingestor

ENV NODE_ENV=production
WORKDIR /app/ingestor
CMD ["node", "src/index.js"]
