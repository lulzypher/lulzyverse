import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as raw from "multiformats/codecs/raw";

/** Deterministic raw-codec CID (v1) from bytes — pin-able as a raw block on Kubo. */
export async function rawCidFromBytes(bytes: Uint8Array): Promise<string> {
  const digest = await sha256.digest(bytes);
  const cid = CID.createV1(raw.code, digest);
  return cid.toString();
}

const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CID_V1 = /^b[a-z2-7]{50,}$/i;

export function looksLikeCid(s: string): boolean {
  return CID_V0.test(s) || CID_V1.test(s);
}
