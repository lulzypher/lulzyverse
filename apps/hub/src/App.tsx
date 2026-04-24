import { useMemo, useState } from "react";
import {
  type EcosystemReferenceEvent,
  eventsToMap,
  ingestReferenceEventsJson,
} from "@altdream/protocol";
import { PinMap } from "./PinMap";

const emptyKey = "";

export function App() {
  const [events, setEvents] = useState<EcosystemReferenceEvent[]>([]);
  const [paste, setPaste] = useState("");
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const [personaFilter, setPersonaFilter] = useState(emptyKey);
  const [bucketFilter, setBucketFilter] = useState(emptyKey);
  const [gatewayBase, setGatewayBase] = useState("http://127.0.0.1:8787");
  const [gatewayToken, setGatewayToken] = useState("");
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const personas = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) {
      if (e.personaDid) s.add(e.personaDid);
    }
    return [...s].sort();
  }, [events]);

  const buckets = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) {
      if (e.ecosystemBucket) s.add(e.ecosystemBucket);
    }
    return [...s].sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (personaFilter && e.personaDid !== personaFilter) return false;
      if (bucketFilter && e.ecosystemBucket !== bucketFilter) return false;
      return true;
    });
  }, [events, personaFilter, bucketFilter]);

  function onFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      applyIngest(text);
    };
    reader.readAsText(f);
    ev.target.value = "";
  }

  function applyIngest(jsonText: string) {
    const map = eventsToMap(events);
    const result = ingestReferenceEventsJson(map, jsonText);
    setEvents(result.events);
    const parts = [`merged: +${result.added} new, ~${result.updated} updated, skipped ${result.skipped}`];
    if (result.errors.length) parts.push(`${result.errors.length} row errors (see console)`);
    setIngestMsg(parts.join(" — "));
    if (result.errors.length) console.warn(result.errors);
  }

  function ingestPaste() {
    if (!paste.trim()) return;
    applyIngest(paste);
    setPaste("");
  }

  async function pullFromGateway() {
    setSyncMsg(null);
    const base = gatewayBase.replace(/\/$/, "");
    const token = gatewayToken.trim();
    if (!token) {
      setSyncMsg("Set a gateway API token (Bearer) first — only kept in this tab’s memory.");
      return;
    }
    try {
      const res = await fetch(`${base}/v1/reference-events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = (await res.json()) as { events?: EcosystemReferenceEvent[] };
      const list = data.events ?? [];
      const map = eventsToMap(events);
      const text = JSON.stringify({ events: list });
      const result = ingestReferenceEventsJson(map, text);
      setEvents(result.events);
      setSyncMsg(`Pulled ${list.length} events from gateway; store now ${result.events.length} rows.`);
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 0.35rem" }}>alt.dream</h1>
        <p style={{ margin: 0, opacity: 0.85, maxWidth: "52rem" }}>
          Local-first hub: import reference events from a gHosted CID map export, filter by persona and bucket, and
          preview how CIDs attach to places.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "#171512",
          borderRadius: 10,
          border: "1px solid #2a2620",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>Import</h2>
        <label>
          <span style={{ display: "block", fontSize: "0.85rem", opacity: 0.8, marginBottom: 4 }}>JSON file</span>
          <input type="file" accept="application/json,.json" onChange={onFile} />
        </label>
        <div>
          <span style={{ display: "block", fontSize: "0.85rem", opacity: 0.8, marginBottom: 4 }}>Paste export JSON</span>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={5}
            style={{ width: "100%", padding: "0.5rem", borderRadius: 6, background: "#0f0e0c", color: "inherit", border: "1px solid #2a2620" }}
            placeholder='[ { "id": "…", "cid": "…", "placeId": "…", "surface": "…", "observedAt": "…" } ]'
          />
          <button type="button" onClick={ingestPaste} style={{ marginTop: 8, padding: "0.35rem 0.75rem", borderRadius: 6, border: "1px solid #3d3830", background: "#242019", color: "inherit" }}>
            Merge into store
          </button>
        </div>
        {ingestMsg ? <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.9 }}>{ingestMsg}</p> : null}
      </section>

      <section
        style={{
          display: "grid",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "#171512",
          borderRadius: 10,
          border: "1px solid #2a2620",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>Gateway sync (optional)</h2>
        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.85 }}>
          Run <code>pnpm --filter @altdream/gateway dev</code>, then pull events the gateway has already stored. For same-origin dev, you can instead configure a Vite proxy (see{" "}
          <code>apps/hub/vite.config.ts</code> — use <code>/gw/...</code> from the browser with a dev token).
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Gateway base URL</span>
          <input
            value={gatewayBase}
            onChange={(e) => setGatewayBase(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", borderRadius: 6, background: "#0f0e0c", color: "inherit", border: "1px solid #2a2620" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>API token (Bearer)</span>
          <input
            type="password"
            autoComplete="off"
            value={gatewayToken}
            onChange={(e) => setGatewayToken(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", borderRadius: 6, background: "#0f0e0c", color: "inherit", border: "1px solid #2a2620" }}
            placeholder="Not stored — session only"
          />
        </label>
        <button
          type="button"
          onClick={pullFromGateway}
          style={{ justifySelf: "start", padding: "0.35rem 0.75rem", borderRadius: 6, border: "1px solid #3d3830", background: "#242019", color: "inherit" }}
        >
          Pull from gateway
        </button>
        {syncMsg ? <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.9 }}>{syncMsg}</p> : null}
      </section>

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Persona DID</span>
          <select
            value={personaFilter}
            onChange={(e) => setPersonaFilter(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", borderRadius: 6, minWidth: 220, background: "#171512", color: "inherit", border: "1px solid #2a2620" }}
          >
            <option value="">(all)</option>
            {personas.map((p) => (
              <option key={p} value={p}>
                {p.length > 48 ? `${p.slice(0, 24)}…` : p}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Ecosystem bucket</span>
          <select
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", borderRadius: 6, minWidth: 160, background: "#171512", color: "inherit", border: "1px solid #2a2620" }}
          >
            <option value="">(all)</option>
            {buckets.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: "0.9rem", opacity: 0.75 }}>
          Showing {filtered.length} of {events.length} events
        </span>
      </section>

      <PinMap events={filtered} />

      <section style={{ marginTop: "1.5rem", overflowX: "auto" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Events</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2620" }}>
              <th style={{ padding: "0.35rem 0.5rem" }}>CID</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>place</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>surface</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>bucket</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>observed</th>
            </tr>
          </thead>
          <tbody>
            {[...filtered]
              .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
              .map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #1f1c18" }}>
                  <td style={{ padding: "0.35rem 0.5rem", fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}>{e.cid}</td>
                  <td style={{ padding: "0.35rem 0.5rem", wordBreak: "break-all" }}>{e.placeId}</td>
                  <td style={{ padding: "0.35rem 0.5rem" }}>{e.surface}</td>
                  <td style={{ padding: "0.35rem 0.5rem" }}>{e.ecosystemBucket ?? "—"}</td>
                  <td style={{ padding: "0.35rem 0.5rem", whiteSpace: "nowrap" }}>{e.observedAt}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
