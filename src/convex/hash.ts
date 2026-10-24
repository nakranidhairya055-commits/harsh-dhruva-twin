/**
 * Deterministic rolling hash used by the DhruvaTwin audit trail.
 *
 * The trail is a hash chain: each command-log entry stores the digest of the
 * previous entry plus its own payload. Recomputing the chain and comparing
 * digests detects any edit, insertion or reordering of historical rows.
 *
 * Implemented as a 64-bit FNV-1a style mixer over two 32-bit lanes so it runs
 * in the Convex default (V8 isolate) runtime without pulling in a crypto
 * dependency.
 */
export function rollingHash(prevHash: string, payload: string): string {
  const input = `${prevHash}|${payload}`;
  let laneA = 0x811c9dc5;
  let laneB = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    laneA = (laneA ^ code) >>> 0;
    laneA = Math.imul(laneA, 0x01000193) >>> 0;
    laneB = (laneB + code) >>> 0;
    laneB = Math.imul(laneB ^ (laneB >>> 13), 0x85ebca6b) >>> 0;
  }
  // Final avalanche so small payload changes flip many bits.
  laneA = Math.imul(laneA ^ (laneA >>> 16), 0x7feb352d) >>> 0;
  laneA = Math.imul(laneA ^ (laneA >>> 15), 0x846ca68b) >>> 0;
  laneB = Math.imul(laneB ^ (laneB >>> 16), 0x2545f491) >>> 0;
  laneB = Math.imul(laneB ^ (laneB >>> 13), 0x9e3779b1) >>> 0;
  return (
    laneA.toString(16).padStart(8, "0") + laneB.toString(16).padStart(8, "0")
  );
}

/** Genesis digest for the first entry of an audit chain. */
export const GENESIS_HASH = "0000000000000000";
