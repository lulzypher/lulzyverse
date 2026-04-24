# gHosted + mobile lite — integration checklist

Work below belongs in the [**gHosted**](https://github.com/lulzypher/gHosted) repository. This file is the contract surface from **alt.dream** (gateway + protocol).

## Protocol

- Align TypeScript/Zod types with [`packages/protocol`](../packages/protocol) (or publish `@altdream/protocol` and depend on it).
- Emit **`EcosystemReferenceEvent`** rows compatible with `ingestReferenceEventsJson` when the CID map / reference graph updates.

## Messenger-only build

- Wire **`VITE_APP_MODE`** / **`APP_MODE`** so a **messenger** bundle exposes only threads, contacts, media, and settings (no full social graph).
- **`VITE_MESSENGER_URL`** on the full client: deep-link “open messages” to the messenger install or URL.

## Capacitor (recommended)

- Add `@capacitor/core`, `@capacitor/cli`, `android`, `ios` projects wrapping the **messenger** Vite build output.
- Configure **HTTPS** API base URL for production; allow cleartext only for dev if platform policy permits.
- File picker / camera plugins for attachments; background upload queue for offload.

## Gateway settings in the app

- Settings fields: **alt.dream base URL** (e.g. `https://gateway.home.example`) and **API token** (Bearer — same as `GATEWAY_API_KEY` on the server, distributed securely).
- Health check: `GET {base}/v1/health` with `Authorization: Bearer …`.

## Offload client

- When attachment size exceeds a threshold (or user toggles “store on my gateway”), `POST {base}/v1/offload` with `multipart/form-data` field **`file`** and optional **`personaDid`**, **`ecosystemBucket`**, **`placeId`**, **`surface`** (see gateway implementation in `apps/gateway`).
- On success, persist returned **`cid`** and **`referenceEvent`** in local gHosted state and include in the next CID-map export.

## Security notes

- Never bake the gateway token into `VITE_*` public env vars for production; store in secure mobile storage after first pairing.
- Document that the gateway operator can read uploads unless payloads are encrypted client-side.

## Store release

- iOS: background modes / data disclosure for uploads and optional IPFS pinning.
- Android: foreground service if long uploads continue with screen off.
