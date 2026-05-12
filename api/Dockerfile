FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY api/package.json ./api/

RUN npm install --omit=dev --workspaces --include-workspace-root

COPY shared ./shared
COPY api ./api

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/api
CMD ["node", "src/server.js"]
