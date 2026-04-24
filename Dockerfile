# Build and run the alt.dream gateway (hub UI is built separately or served via static hosting).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/protocol/package.json packages/protocol/
COPY apps/gateway/package.json apps/gateway/
COPY apps/hub/package.json apps/hub/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/protocol packages/protocol
COPY apps/gateway apps/gateway
COPY apps/hub apps/hub
COPY tsconfig.base.json ./
RUN pnpm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/altdream.db
ENV BLOB_DIR=/data/blobs
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/protocol ./packages/protocol
COPY --from=build /app/apps/gateway ./apps/gateway
RUN mkdir -p /data/blobs
EXPOSE 8787
CMD ["node", "apps/gateway/dist/index.js"]
