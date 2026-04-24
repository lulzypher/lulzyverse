# alt.dream — planning

This document captures product and architecture intent for the ecosystem. It is living notes, not a spec. It extends the [README](../README.md) with deeper narrative and Shadowbox-related planning where those pieces touch the hub.

---

## Surfaces and roles

| Surface | Role |
|--------|------|
| **alt.dream (this hub)** | Browser shell: cross-app views, personas, per-app buckets, pin health, CID graph ingestion — see README. |
| **gHosted.u** | Messenger / slimmer client — auth and messaging; pairs with the full social build ([gHosted](https://github.com/lulzypher/gHosted)). |
| **Shadowbox** | Modular personal infrastructure (runtimes, jobs, scheduling, settlement) — one **ecosystem bucket** the hub can summarize alongside gHosted. |

**Ecosystem principles**

- **Local-first** aggregation: the hub explains what the user exports or syncs; no pretend single-database truth for all bytes.
- Shared visual language across surfaces so companion apps read as one ecosystem.
- Optional depth: visitors do not need every product to understand the hub.

---

## Experience: optional LARP-centered presentation

**Intent.** Some surfaces may **read and feel like a LARP** (live-action role-play): factions, guilds, quests, diegetic UI — while cryptography and infra stay explicit in OOC docs.

**What that can mean in product**

- **Diegetic naming** — optional in-world labels for pipelines, coalitions, or modules; exact lexicon TBD.
- **Opt-in depth** — Plain-language / “out of character” (OOC) paths for specs without lore.
- **Boundaries** — LARP framing is not a substitute for consent, safety tooling, or terms of service. Anything that affects money, keys, or third parties stays **explicitly signposted**.

---

## On-chain coordination and MPC “servers”

**Intent.** Use **on-chain** layers mainly for **coordination, commitments, and settlement** — not as a replacement for off-chain compute. Use **MPC** (multi-party computation) where **no single party should hold a full secret** or where **private inputs** must be combined without revealing them to each other.

**“MPC servers” as a product metaphor**

- Technically: a **threshold coalition** (t-of-n operators) for DKG/signing, private aggregation, or gated release.
- Heavier always-on services still need **clear trust and abuse models**; MPC helps **key and policy custody**, not magic scaling.

**Rough split**

| Concern | On-chain (typical) | MPC / off-chain (typical) |
|--------|-------------------|---------------------------|
| Identity of coalition, stakes, rotation | Registries, deposits, slashing rules | Key shares, protocol rounds |
| Bounty / escrow for a verifiable deliverable | Lock funds, payout on attested receipt | Optional: threshold attestation |
| Private inputs | Commitments, nullifiers where needed | Actual MPC math, execution |

---

## Shadowbox (platform)

**Purpose.** Modular **personal infrastructure** — orchestration and runtime for short-lived or on-demand workloads (previews, webhooks, sandboxes, scheduled capture jobs, etc.), aligned with **ecosystemBucket** reporting in the hub.

**Positioning.** Distinct from day-to-day **gHosted** social surfaces; summarized as its own bucket in cross-app dashboards.

---

## ArchiveBox (module)

**Relationship.** ArchiveBox is a **component module** of Shadowbox when that stack ships — preservation-oriented jobs and receipts inside the broader Shadowbox catalog.

---

## Economics: sharing first, optional markets later

**Default culture.** Sharing-based: capacity, pipelines, pinning, mutual aid — reputation and reciprocity.

**Future: paid pipelines (crypto)** — optional when completion must be guaranteed and outputs are **verifiable** (hashes, bundles, attestations).

---

## One-line pitch (draft)

**alt.dream** is the hub that makes **pins, personas, and bandwidth** legible across apps. **gHosted** is the social layer; **Shadowbox** (when enabled) is modular personal infra — run what you need, share what you can.

---

## Mobile messenger + gateway pairing

**Goal.** gHosted ships as a **lite messenger** on Android / iOS (Capacitor-wrapped web client is the default path). The user may run **alt.dream gateway** on a machine they control (home NAS, PC, or VPS) and enter its **HTTPS base URL** plus an **API token** in the messenger settings.

**Pairing v1 (implemented on gateway side).** Bearer token (`GATEWAY_API_KEY`) per deployment. The hub UI can pull events for debugging; gHosted should obtain the token out-of-band (QR from hub admin screen later, or copy-paste once).

**Offload flow.** Large chat attachments (or user opt-in) upload to `POST /v1/offload` (multipart `file` + optional `personaDid`, `ecosystemBucket`, `placeId`, `surface`). Gateway stores bytes, computes a **raw leaf CID**, records a **`EcosystemReferenceEvent`**, and optionally calls **Kubo** `api/v0/add` when `IPFS_API_URL` is set.

**Local-first.** The phone keeps hot conversation state locally; offload reduces device pressure for cold media while preserving **CID + reference event** as the cross-device handle.

---

## Trust model (gateway)

Whoever runs the gateway is a **full trust anchor** for anything uploaded or pinned through it: they can read blobs (unless gHosted encrypts ciphertext client-side before upload), throttle, delete local copies, and see metadata (MIME, sizes, persona/bucket tags).

**Mitigations to document in product copy**

- Self-host by default; TLS in front; rotate `GATEWAY_API_KEY`; separate keys per household if needed.
- E2E messaging: if message bodies stay encrypted end-to-end, the gateway may still see **attachment ciphertext** and sizes — say so plainly in UX.

---

## Offload vs encryption

- **Cleartext upload:** gateway and any backup see content — only for non-sensitive media or when user accepts.
- **Ciphertext upload:** gateway stores an opaque blob; legibility in the hub is “size + CID + bucket” without content inspection.
- **Pinning:** optional Kubo add does not change trust — the IPFS network may host retrievable blocks; treat pins as **public distribution** unless encrypted.

---

## Open decisions

- First-party ingestion paths vs gHosted CID map JSON (exact export filename and schema versioning).
- Self-hosted vs hosted deployment defaults for non-technical users.
- How much optional LARP presentation ships in v1 vs plain “infra dashboard” mode.
- MPC scope for first user journeys (signing, release, attestation) vs traditional single-operator modules.
