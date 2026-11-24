# Builds the API and the React client into one image. Build from the repository root:
#   docker build -t swiftdrop .
FROM node:22-slim AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client ./
RUN npm run build

FROM node:22-slim AS server
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx tsc -p tsconfig.json

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production CLIENT_DIST_DIR=/app/client-dist
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=server /app/dist ./dist
COPY --from=client /client/dist ./client-dist
COPY server/migrations ./migrations
COPY server/seeds ./seeds
EXPOSE 4000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]
