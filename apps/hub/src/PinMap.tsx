import { useMemo } from "react";
import type { EcosystemReferenceEvent } from "@altdream/protocol";

type Props = { events: EcosystemReferenceEvent[] };

/** Minimal “pin map”: place → CID adjacency, rendered as a readable list (no heavy graph lib). */
export function PinMap({ events }: Props) {
  const byPlace = useMemo(() => {
    const m = new Map<string, EcosystemReferenceEvent[]>();
    for (const e of events) {
      const list = m.get(e.placeId) ?? [];
      list.push(e);
      m.set(e.placeId, list);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const uniqueCids = useMemo(() => new Set(events.map((e) => e.cid)).size, [events]);

  return (
    <section
      style={{
        padding: "1rem",
        background: "#171512",
        borderRadius: 10,
        border: "1px solid #2a2620",
        marginBottom: "1.5rem",
      }}
    >
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Pin map (by place)</h2>
      <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", opacity: 0.85 }}>
        {events.length} reference events, {uniqueCids} distinct CIDs, {byPlace.length} places.
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.65rem" }}>
        {byPlace.map(([placeId, list]) => (
          <li key={placeId} style={{ lineHeight: 1.4 }}>
            <strong style={{ wordBreak: "break-all" }}>{placeId}</strong>
            <span style={{ opacity: 0.65 }}> ({list.length})</span>
            <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.1rem", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", opacity: 0.92 }}>
              {list.map((e) => (
                <li key={e.id} style={{ wordBreak: "break-all" }}>
                  {e.cid}
                  <span style={{ opacity: 0.6, fontFamily: "inherit" }}>
                    {" "}
                    — {e.surface}
                    {e.ecosystemBucket ? ` · ${e.ecosystemBucket}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {byPlace.length === 0 ? <p style={{ margin: 0, opacity: 0.7 }}>Import JSON to see places and CIDs.</p> : null}
    </section>
  );
}
