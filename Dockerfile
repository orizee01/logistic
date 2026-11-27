# Builds the API and the React client into one image. Build from the repository root:
#   docker build -t swiftdrop .
# BASE_PATH is the URL prefix the site is served under (no trailing slash; empty serves from the root).
ARG BASE_PATH=/swiftdrop
FROM node:22-slim AS client
ARG BASE_PATH
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client ./
RUN npm run build -- --base="${BASE_PATH}/"

FROM node:22-slim AS server
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx tsc -p tsconfig.json

FROM node:22-slim
WORKDIR /app
ARG BASE_PATH
ENV NODE_ENV=production CLIENT_DIST_DIR=/app/client-dist BASE_PATH=$BASE_PATH
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=server /app/dist ./dist
COPY --from=client /client/dist ./client-dist
COPY server/migrations ./migrations
COPY server/seeds ./seeds
EXPOSE 4000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]
