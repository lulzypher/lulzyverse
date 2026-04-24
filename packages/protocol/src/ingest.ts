import type { EcosystemReferenceEvent } from "./schemas.js";
import { ecosystemReferenceEventSchema, referenceExportSchema } from "./schemas.js";

export type IngestResult = {
  events: EcosystemReferenceEvent[];
  added: number;
  updated: number;
  skipped: number;
  errors: { index: number; message: string }[];
};

export function normalizeReferenceExport(raw: unknown): EcosystemReferenceEvent[] {
  const parsed = referenceExportSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }
  const v = parsed.data;
  if (Array.isArray(v)) return v;
  return v.events;
}

/** Merge incoming reference events into an existing map keyed by event id (replay-safe). */
/** Exported for gateway batch ingest. */
export function mergeReferenceEvents(
  existing: Map<string, EcosystemReferenceEvent>,
  incoming: EcosystemReferenceEvent[],
): { map: Map<string, EcosystemReferenceEvent>; added: number; updated: number; skipped: number } {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const map = new Map(existing);

  for (const ev of incoming) {
    const prev = map.get(ev.id);
    if (!prev) {
      map.set(ev.id, ev);
      added++;
      continue;
    }
    const prevT = Date.parse(prev.observedAt);
    const nextT = Date.parse(ev.observedAt);
    if (!Number.isNaN(nextT) && !Number.isNaN(prevT) && nextT >= prevT) {
      map.set(ev.id, ev);
      updated++;
    } else if (Number.isNaN(nextT) && Number.isNaN(prevT) && ev.observedAt >= prev.observedAt) {
      map.set(ev.id, ev);
      updated++;
    } else {
      skipped++;
    }
  }
  return { map, added, updated, skipped };
}

/**
 * Parse gHosted-style CID map / reference export JSON and merge into the store.
 * Accepts either a bare array of events or `{ events: [...] }`.
 */
export function ingestReferenceEventsJson(
  existing: Map<string, EcosystemReferenceEvent>,
  jsonText: string,
): IngestResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText) as unknown;
  } catch (e) {
    return {
      events: [...existing.values()],
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [{ index: 0, message: e instanceof Error ? e.message : "Invalid JSON" }],
    };
  }

  let list: unknown[];
  try {
    list = normalizeReferenceExport(raw);
  } catch (e) {
    return {
      events: [...existing.values()],
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [{ index: 0, message: e instanceof Error ? e.message : "Invalid export shape" }],
    };
  }

  const errors: { index: number; message: string }[] = [];
  const valid: EcosystemReferenceEvent[] = [];
  list.forEach((item, index) => {
    const r = ecosystemReferenceEventSchema.safeParse(item);
    if (r.success) valid.push(r.data);
    else errors.push({ index, message: r.error.message });
  });

  const { map, added, updated, skipped } = mergeReferenceEvents(existing, valid);
  return {
    events: [...map.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt)),
    added,
    updated,
    skipped,
    errors,
  };
}

export function eventsToMap(events: EcosystemReferenceEvent[]): Map<string, EcosystemReferenceEvent> {
  const m = new Map<string, EcosystemReferenceEvent>();
  for (const e of events) m.set(e.id, e);
  return m;
}
