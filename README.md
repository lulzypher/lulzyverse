# alt.dream

**alt.dream** is a browser hub for a small digital ecosystem: an **alternative dream** to corporate centralization — one where **IPFS**, **DIDs**, and **your** nodes carry identity, media, and sync instead of a single company’s servers.

The name is intentional: not escapism, but a **different shape of infrastructure** — legible pinning, personas, bandwidth, and “who holds what” across the apps you choose to run.

## What lives here

This repository is the **shell / dashboard** for that story:

- **Cross-app views** — pin health, storage, and usage narratives that span more than one app.
- **Personas** — DID-backed identities; one human may run several public faces with clear data boundaries.
- **Per-app buckets** — data grouped under an ecosystem app for each persona (for example **gHosted** for social, **Shadowbox** for other workloads) so the hub can show clean, per-bucket breakdowns.

Companion apps (like [**gHosted**](https://github.com/lulzypher/gHosted)) emit structured **reference events** and export data the hub can ingest to build **CID graphs**, **pin maps**, and future mesh metrics.

## Relationship to gHosted

[**gHosted**](https://github.com/lulzypher/gHosted) is the decentralized social / media experience in this ecosystem. alt.dream is not a clone of gHosted; it **orchestrates and explains** what multiple apps do to your pins, keys, and bandwidth.

Rough split you can mirror in deploys:

| Surface | Role |
|--------|------|
| **alt.dream (full client)** | Social graph, posts, groups, IPFS-backed profiles, pin map, ecosystem tooling. |
| **gHosted.u (messenger)** | Dedicated inbox: auth + encrypted-style messaging; slimmer API and client bundle. |

From the full app, “open messages” should land on your messenger URL (for example **gHosted.u**), not inside the heavy social shell.

## Shared protocol (ecosystem)

Until there is a published npm package, ecosystem types and Zod schemas live in this repo under [`packages/protocol`](packages/protocol) (keep in sync with gHosted when `shared/ecosystemProtocol.ts` exists there). They define shapes such as:

- **`EcosystemReferenceEvent`** — links a CID (or content digest) to a stable place id, surface, optional `personaDid`, optional `ecosystemBucket`.
- **`PinIntent`** — optional declaration that a user intends to pin a CID (for dashboards).
- **`ConversationPolicy` / `ParticipantMediaPolicy`** — local-first chat retention and media preferences.

**Ingestion:** the hub accepts the same JSON shape the gHosted **CID map** export is expected to use, merges with `ingestReferenceEventsJson` from `@altdream/protocol`, and partitions views by **`personaDid` + `ecosystemBucket`**.

## Goals (non-exhaustive)

- Make **pin support, space, and bandwidth** understandable across personas and apps.
- Stay **local-first** where possible; aggregate only what the user explicitly syncs or exports.
- Grow toward **mesh** visibility (libp2p / pinning metrics) without pretending every byte lives in one database.

## Development

**Requirements:** Node.js 22+ and [pnpm](https://pnpm.io/) 9 (or run commands via `npx pnpm@9.15.4 …` if pnpm is not global).

```bash
cp .env.example .env
# Set GATEWAY_API_KEY in .env for a serious local run. If empty, the gateway accepts Bearer `dev-insecure-change-me` only for local dev.

pnpm install
pnpm dev
```

- **Hub** (Vite + React): [http://localhost:5173](http://localhost:5173) — import or paste reference-event JSON, filter by persona and bucket, inspect the pin map.
- **Gateway** (Hono + SQLite): [http://localhost:8787](http://localhost:8787) — `GET /v1/health` with header `Authorization: Bearer <GATEWAY_API_KEY>`.

The hub dev server proxies `/gw/*` → gateway `/v1/*` so you can avoid CORS while testing (keep API tokens in the hub UI only; do not ship secrets in `VITE_*` vars).

**Production builds**

```bash
pnpm run build
node apps/gateway/dist/index.js
# Serve apps/hub/dist with any static host (nginx, S3, etc.).
```

**Docker**

```bash
docker compose up --build
# Optional Kubo sidecar on the same Docker network — set IPFS_API_URL=http://ipfs:5001 in .env then:
docker compose --profile ipfs up --build
```

Point a local [**gHosted**](https://github.com/lulzypher/gHosted) instance at this gateway for attachment offload once the client supports it — see [docs/GHOSTED_MOBILE_HANDOFF.md](docs/GHOSTED_MOBILE_HANDOFF.md). Living architecture notes: [docs/planning.md](docs/planning.md).

### Repository layout

| Path | Role |
|------|------|
| `apps/hub` | Dashboard UI |
| `apps/gateway` | HTTPS API: offload uploads, merge reference events, summaries |
| `packages/protocol` | Zod schemas + `ingestReferenceEventsJson` |

Suggested environment ideas for a split deploy:

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_APP_MODE` | gHosted **client build** | `altdream` vs `messenger` — two Vite bundles. |
| `APP_MODE` | gHosted **server** | `full` vs `messenger` — gates social APIs vs messaging-only. |
| `VITE_MESSENGER_URL` | gHosted **alt.dream build** | Where the header “messages” link should open (e.g. `https://gHosted.u`). |

## License

[MIT](LICENSE). Issues and PRs are welcome for the hub, gateway, and protocol package; behavior of companion apps belongs in their own repositories.

---

**alt.dream** — *an alternative dream: freedom, legibility, and your mesh.*
