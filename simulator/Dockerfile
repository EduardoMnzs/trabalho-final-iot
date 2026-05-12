FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY simulator/package.json ./simulator/

RUN npm install --omit=dev --workspaces --include-workspace-root

COPY shared ./shared
COPY simulator ./simulator

ENV NODE_ENV=production
WORKDIR /app/simulator
CMD ["node", "src/index.js"]
