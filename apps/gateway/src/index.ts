import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  ecosystemReferenceEventSchema,
  ingestReferenceEventsJson,
  mergeReferenceEvents,
  type EcosystemReferenceEvent,
} from "@altdream/protocol";
import { openDb, loadAllEvents, upsertEvent, upsertBlob } from "./db.js";
import { rawCidFromBytes, looksLikeCid } from "./cid.js";

const PORT = Number(process.env.PORT ?? "8787");
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? "";
const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/altdream.db";
const BLOB_DIR = process.env.BLOB_DIR ?? "./data/blobs";
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? String(50 * 1024 * 1024));
const ALLOWED_MIMES = new Set(
  (process.env.ALLOWED_MIMES ?? "image/jpeg,image/png,image/webp,image/gif,video/mp4,application/octet-stream")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
const IPFS_API_URL = process.env.IPFS_API_URL?.replace(/\/$/, "");

if (!GATEWAY_API_KEY) {
  console.warn("[gateway] GATEWAY_API_KEY is empty — set a secret before exposing to a network.");
}

await mkdir(BLOB_DIR, { recursive: true });
await mkdir(dirname(DATABASE_PATH), { recursive: true });

const db = openDb(DATABASE_PATH);

const app = new Hono();

app.get("/public/cid/:cid", (c) => {
  const cid = c.req.param("cid");
  return c.json({ cid, ok: looksLikeCid(cid) });
});

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

const authed = new Hono();
authed.use("*", bearerAuth({ token: GATEWAY_API_KEY || "dev-insecure-change-me" }));

authed.get("/health", (c) => c.json({ ok: true, service: "alt.dream-gateway" }));

authed.get("/reference-events", (c) => {
  const map = loadAllEvents(db);
  return c.json({ events: [...map.values()] });
});

authed.post("/reference-events", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return c.json({ error: "Invalid JSON" }, 400);
  const events = Array.isArray((body as { events?: unknown }).events)
    ? (body as { events: unknown[] }).events
    : null;
  if (!events) return c.json({ error: "Expected { events: [...] }" }, 400);

  const existing = loadAllEvents(db);
  const valid: EcosystemReferenceEvent[] = [];
  const errors: { index: number; message: string }[] = [];
  events.forEach((item, index) => {
    const r = ecosystemReferenceEventSchema.safeParse(item);
    if (r.success) valid.push(r.data);
    else errors.push({ index, message: r.error.message });
  });
  const { map, added, updated, skipped } = mergeReferenceEvents(existing, valid);
  for (const ev of map.values()) upsertEvent(db, ev);
  return c.json({ ok: true, added, updated, skipped, stored: map.size, errors });
});

authed.get("/pins/summary", (c) => {
  const map = loadAllEvents(db);
  const byBucket = new Map<string, number>();
  const byPersona = new Map<string, number>();
  for (const ev of map.values()) {
    const b = ev.ecosystemBucket ?? "_none";
    byBucket.set(b, (byBucket.get(b) ?? 0) + 1);
    const p = ev.personaDid ?? "_none";
    byPersona.set(p, (byPersona.get(p) ?? 0) + 1);
  }
  return c.json({
    totalEvents: map.size,
    byEcosystemBucket: Object.fromEntries(byBucket),
    byPersonaDid: Object.fromEntries(byPersona),
  });
});

authed.post("/offload", async (c) => {
  const ct = c.req.header("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return c.json({ error: "Use multipart/form-data with field file" }, 400);
  }
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ error: "Missing file field" }, 400);

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIMES.has(mime)) return c.json({ error: `MIME not allowed: ${mime}` }, 415);

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_UPLOAD_BYTES) return c.json({ error: "File too large" }, 413);

  const bytes = new Uint8Array(buf);
  const cid = await rawCidFromBytes(bytes);
  const diskPath = join(BLOB_DIR, cid);
  await writeFile(diskPath, buf);
  upsertBlob(db, { cid, path: diskPath, mime, size: buf.length });

  if (IPFS_API_URL) {
    try {
      const fd = new FormData();
      fd.set("file", new Blob([buf], { type: mime }), "blob");
      const url = `${IPFS_API_URL}/api/v0/add?pin=true`;
      await fetch(url, { method: "POST", body: fd });
    } catch (e) {
      console.warn("[gateway] IPFS add failed", e);
    }
  }

  const placeId = String(form.get("placeId") ?? `offload:${cid.slice(0, 12)}`);
  const surface = String(form.get("surface") ?? "messenger.offload");
  const personaDid = form.get("personaDid") ? String(form.get("personaDid")) : undefined;
  const ecosystemBucket = form.get("ecosystemBucket") ? String(form.get("ecosystemBucket")) : "gHosted";

  const ev: EcosystemReferenceEvent = {
    id: randomUUID(),
    cid,
    placeId,
    surface,
    personaDid,
    ecosystemBucket,
    observedAt: new Date().toISOString(),
    meta: { mime, size: buf.length, source: "gateway.offload" },
  };
  const r = ecosystemReferenceEventSchema.safeParse(ev);
  if (!r.success) return c.json({ error: r.error.message }, 500);
  upsertEvent(db, r.data);

  return c.json({
    cid,
    referenceEvent: r.data,
  });
});

authed.post("/ingest-json", async (c) => {
  const text = await c.req.text();
  const existing = loadAllEvents(db);
  const result = ingestReferenceEventsJson(existing, text);
  if (result.errors.length && result.added === 0 && result.updated === 0) {
    return c.json({ error: "ingest failed", details: result.errors }, 400);
  }
  for (const ev of result.events) upsertEvent(db, ev);
  return c.json({
    ok: true,
    added: result.added,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors,
    total: result.events.length,
  });
});

app.route("/v1", authed);

app.get("/", (c) => c.text("alt.dream gateway — use /v1/* with Authorization: Bearer <GATEWAY_API_KEY>"));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[gateway] http://localhost:${info.port}`);
});
