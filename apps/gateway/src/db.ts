import Database from "better-sqlite3";
import type { EcosystemReferenceEvent } from "@altdream/protocol";

export function openDb(path: string): Database.Database {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS reference_events (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blobs (
      cid TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export function loadAllEvents(db: Database.Database): Map<string, EcosystemReferenceEvent> {
  const rows = db.prepare("SELECT id, payload FROM reference_events").all() as { id: string; payload: string }[];
  const m = new Map<string, EcosystemReferenceEvent>();
  for (const r of rows) {
    try {
      const ev = JSON.parse(r.payload) as EcosystemReferenceEvent;
      m.set(r.id, ev);
    } catch {
      /* skip corrupt */
    }
  }
  return m;
}

export function upsertEvent(db: Database.Database, ev: EcosystemReferenceEvent): void {
  db.prepare(
    `INSERT INTO reference_events (id, payload) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  ).run(ev.id, JSON.stringify(ev));
}

export function upsertBlob(db: Database.Database, row: { cid: string; path: string; mime: string; size: number }): void {
  db.prepare(
    `INSERT INTO blobs (cid, path, mime, size, created_at) VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(cid) DO UPDATE SET path = excluded.path, mime = excluded.mime, size = excluded.size`,
  ).run(row.cid, row.path, row.mime, row.size);
}
