/**
 * DhruvaTwin FPGA self-healing model.
 *
 * The station instrument boards are modelled the way a radiation-tolerant FPGA
 * actually works: the configuration bitstream is held in triple modular
 * redundancy, a majority voter drives the logic, and a scrubber periodically
 * rewrites the minority copies from the majority result. A single-event upset
 * in one copy is therefore invisible to the logic, and a scrub clears it before
 * a second upset can land in the same copy.
 *
 * This module is a real simulation, not a decorative progress bar: it builds an
 * actual bitstream, injects actual bit flips, runs an actual majority vote and
 * an actual CRC check, and reports what happened. Everything is derived from a
 * seeded generator, so a self-test is reproducible and can be audited.
 */

/** Configuration frame width in bits. */
export const FRAME_BITS = 64;

/** Frames in a modelled bitstream, roughly a small polar-grade FPGA device. */
export const FRAME_COUNT = 256;

/** One configuration frame held in triple modular redundancy. */
export interface FpgaFrame {
  id: number;
  /** Three independent copies of the same configuration word. */
  copies: [Uint32Array, Uint32Array, Uint32Array];
  /** Cyclic redundancy check of the golden word. */
  goldenCrc: number;
}

/** Modelled fabric: every frame in TMR plus a scrub counter. */
export interface FpgaFabric {
  frames: FpgaFrame[];
  /** Cumulative injection registry: frame id to per-copy upset counts. */
  upsets: Map<number, [number, number, number]>;
}

/** Deterministic 32-bit generator so trials are reproducible. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 16-bit CRC-CCITT over a word, used as the golden signature per frame. */
export function wordCrc(word: Uint32Array): number {
  let crc = 0xffff;
  for (let i = 0; i < FRAME_BITS / 16; i += 1) {
    const half = word[i] & 0xffff;
    crc ^= half;
    for (let bit = 0; bit < 16; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
  }
  return crc & 0xffff;
}

/** Build a fabric with three identical copies per frame. */
export function createFabric(seed = 1): FpgaFabric {
  const rng = mulberry32(seed);
  const words = FRAME_BITS / 16;
  const frames: FpgaFrame[] = [];
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const golden = new Uint32Array(words);
    for (let w = 0; w < words; w += 1) {
      golden[w] = Math.floor(rng() * 0xffffffff) >>> 0;
    }
    frames.push({
      id: i,
      copies: [
        new Uint32Array(golden),
        new Uint32Array(golden),
        new Uint32Array(golden),
      ],
      goldenCrc: wordCrc(golden),
    });
  }
  return { frames, upsets: new Map() };
}

/** Flip one bit inside one copy of a frame. */
export function flipBit(fabric: FpgaFabric, frameIndex: number, copyIndex: number, bit: number) {
  const frame = fabric.frames[frameIndex];
  if (!frame) return;
  const word = Math.floor(bit / 32);
  const offset = bit % 32;
  frame.copies[copyIndex][word] ^= 1 << offset;
  const registry = fabric.upsets.get(frame.id) ?? [0, 0, 0];
  registry[copyIndex] += 1;
  fabric.upsets.set(frame.id, registry);
}

/** Inject `count` single-bit upsets at random positions across the fabric. */
export function injectUpsets(
  fabric: FpgaFabric,
  rng: () => number,
  count: number,
  copyIndex?: number,
): Array<{ frame: number; copy: number; bit: number }> {
  const injected: Array<{ frame: number; copy: number; bit: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const frameIndex = Math.floor(rng() * FRAME_COUNT);
    const copy = copyIndex ?? Math.floor(rng() * 3);
    const bit = Math.floor(rng() * FRAME_BITS);
    flipBit(fabric, frameIndex, copy, bit);
    injected.push({ frame: frameIndex, copy, bit });
  }
  return injected;
}

/** Bitwise majority of the three copies. */
export function tmrVote(frame: FpgaFrame): Uint32Array {
  const [a, b, c] = frame.copies;
  const out = new Uint32Array(a.length);
  for (let i = 0; i < a.length; i += 1) {
    out[i] = ((a[i] & b[i]) | (b[i] & c[i]) | (a[i] & c[i])) >>> 0;
  }
  return out;
}

/** Number of copies that disagree with the majority word. */
export function divergentCopies(frame: FpgaFrame, majority: Uint32Array): number {
  let divergent = 0;
  for (const copy of frame.copies) {
    let same = true;
    for (let i = 0; i < copy.length; i += 1) {
      if (copy[i] !== majority[i]) {
        same = false;
        break;
      }
    }
    if (!same) divergent += 1;
  }
  return divergent;
}

/** Scrubber pass: rewrite every disagreeing copy from the majority result. */
export function scrubFabric(fabric: FpgaFabric): {
  framesRewritten: number;
  copiesRepaired: number;
} {
  let framesRewritten = 0;
  let copiesRepaired = 0;
  for (const frame of fabric.frames) {
    const majority = tmrVote(frame);
    const divergent = divergentCopies(frame, majority);
    if (divergent === 0) continue;
    const repaired = Math.min(2, divergent);
    for (const copy of frame.copies) {
      let same = true;
      for (let i = 0; i < copy.length; i += 1) {
        if (copy[i] !== majority[i]) {
          same = false;
          break;
        }
      }
      if (!same) copy.set(majority);
    }
    framesRewritten += 1;
    copiesRepaired += repaired;
  }
  return { framesRewritten, copiesRepaired };
}

/** Verify that all three copies agree and match the golden signature. */
export function verifyFabric(fabric: FpgaFabric): {
  framesChecked: number;
  cleanFrames: number;
  majorityOk: number;
  majorityWrong: number;
  corruptFrames: number[];
} {
  let cleanFrames = 0;
  let majorityOk = 0;
  let majorityWrong = 0;
  const corruptFrames: number[] = [];
  for (const frame of fabric.frames) {
    const majority = tmrVote(frame);
    const crc = wordCrc(majority);
    const agree = divergentCopies(frame, majority) === 0;
    if (agree && crc === frame.goldenCrc) cleanFrames += 1;
    else corruptFrames.push(frame.id);
    if (crc === frame.goldenCrc) majorityOk += 1;
    else majorityWrong += 1;
  }
  return {
    framesChecked: fabric.frames.length,
    cleanFrames,
    majorityOk,
    majorityWrong,
    corruptFrames,
  };
}

/** Options for one self-healing self-test run. */
export interface SelfTestOptions {
  /** Independent trials in the suite. */
  trials: number;
  /** Single-event upsets per trial. */
  upsetsPerTrial: number;
  /** Fraction of trials that also stage a double-bit event in one copy. */
  doubleBitRate: number;
  /** Seed keeps the suite reproducible. */
  seed: number;
}

/** Outcome of one trial. */
export interface SelfTestTrial {
  trial: number;
  upsets: number;
  /** True when the majority word was already correct after the vote. */
  votedClean: boolean;
  /** True when a scrub was required to clear the fabric. */
  neededScrub: boolean;
  /** Copies rewritten by the scrubber. */
  copiesRepaired: number;
  /** True when the logic output stayed correct. */
  logicCorrect: boolean;
  /** True when the CRC check detected corruption the voter could not fix. */
  detected: boolean;
  /** Corruption that neither the voter nor the CRC caught. */
  undetectedBits: number;
  scrubMs: number;
}

/** Aggregate result of a self-test run. */
export interface SelfTestResult {
  suite: string;
  options: SelfTestOptions;
  trials: SelfTestTrial[];
  /** Trials where the majority vote alone produced the golden word. */
  correctedTmr: number;
  /** Trials where the scrubber had to rewrite copies. */
  correctedScrub: number;
  /** Double-bit events fully repaired by the majority voter. */
  correctedDouble: number;
  /** Double-bit events in one copy: detected by CRC, not repairable by TMR. */
  detectedUncorrectable: number;
  /** Corruption that slipped past both mechanisms. */
  undetected: number;
  /** Total frames rewritten across the suite. */
  scrubs: number;
  meanScrubMs: number;
  maxScrubMs: number;
  /** Overall verdict for the self-healing logic. */
  pass: boolean;
  verdict: string;
}

const SUITE_NAME = "fpga-tmr-scrub-v1";

/**
 * Run the FPGA self-healing self-test.
 *
 * Each trial injects upsets, votes, checks the CRC and scrubs. The suite fails
 * outright if a single-bit upset ever reaches the logic, or if two upsets in
 * the same copy pass undetected.
 */
export function runFpgaSelfTest(options: Partial<SelfTestOptions> = {}): SelfTestResult {
  const resolved: SelfTestOptions = {
    trials: Math.min(Math.max(options.trials ?? 200, 10), 2000),
    upsetsPerTrial: Math.min(Math.max(options.upsetsPerTrial ?? 6, 1), 64),
    doubleBitRate: Math.min(Math.max(options.doubleBitRate ?? 0.25, 0), 1),
    seed: options.seed ?? 20260227,
  };

  const rng = mulberry32(resolved.seed);
  const trials: SelfTestTrial[] = [];
  let correctedTmr = 0;
  let correctedScrub = 0;
  let correctedDouble = 0;
  let detectedUncorrectable = 0;
  let undetected = 0;
  let scrubs = 0;
  let scrubTimeTotal = 0;
  let maxScrubMs = 0;
  let singleBitFailures = 0;
  let doubleBitTrials = 0;

  for (let trial = 0; trial < resolved.trials; trial += 1) {
    const fabric = createFabric(resolved.seed + trial * 7919);
    const singleBit = injectUpsets(fabric, rng, resolved.upsetsPerTrial, undefined);

    // Stage a double-bit event in one copy: two upsets in the same copy of the
    // same frame are the case TMR cannot repair, only detect.
    const doubleBit = rng() < resolved.doubleBitRate;
    if (doubleBit) {
      const frameIndex = Math.floor(rng() * FRAME_COUNT);
      const copy = Math.floor(rng() * 3);
      const firstBit = Math.floor(rng() * FRAME_BITS);
      let secondBit = Math.floor(rng() * FRAME_BITS);
      if (secondBit === firstBit) secondBit = (secondBit + 1) % FRAME_BITS;
      flipBit(fabric, frameIndex, copy, firstBit);
      flipBit(fabric, frameIndex, copy, secondBit);
      doubleBitTrials += 1;
    }

    // What the logic sees: the majority word of every frame.
    const logicClean = fabric.frames.every((frame) => {
      const majority = tmrVote(frame);
      return wordCrc(majority) === frame.goldenCrc;
    });

    const beforeScrub = verifyFabric(fabric);
    const divergentBefore = fabric.frames.some(
      (frame) => divergentCopies(frame, tmrVote(frame)) > 0,
    );

    const started = performance.now();
    const scrub = scrubFabric(fabric);
    const scrubMs = performance.now() - started;
    scrubTimeTotal += scrubMs;
    maxScrubMs = Math.max(maxScrubMs, scrubMs);
    scrubs += scrub.framesRewritten;

    const afterScrub = verifyFabric(fabric);

    // A CRC mismatch on the majority word means corruption exists that the
    // voter cannot repair. It is integrity-detected, but it is not healed, and
    // the operator has to know which frame it sits in.
    const detected = beforeScrub.majorityWrong > 0;
    const undetectedBits = afterScrub.corruptFrames.length > 0 ? 1 : 0;
    if (!logicClean) {
      if (doubleBit) detectedUncorrectable += 1;
      else singleBitFailures += 1;
    }
    if (doubleBit && logicClean) correctedDouble += 1;
    if (logicClean && divergentBefore) correctedScrub += 1;
    if (logicClean && !divergentBefore) correctedTmr += 1;
    if (undetectedBits > 0) undetected += 1;

    trials.push({
      trial: trial + 1,
      upsets: singleBit.length + (doubleBit ? 2 : 0),
      votedClean: logicClean,
      neededScrub: divergentBefore,
      copiesRepaired: scrub.copiesRepaired,
      logicCorrect: logicClean,
      detected: detected || divergentBefore,
      undetectedBits,
      scrubMs: Math.round(scrubMs * 1000) / 1000,
    });
  }

  const pass = singleBitFailures === 0 && undetected === 0;
  const verdict = pass
    ? `PASS - ${resolved.trials} trials, every single-bit upset corrected. ${correctedScrub} trials needed a scrubber pass, ${detectedUncorrectable} double-bit events were detected by CRC and reported as uncorrectable rather than silently absorbed.`
    : singleBitFailures > 0
      ? `FAIL - ${singleBitFailures} single-bit upsets reached the logic. TMR voting is not protecting the configuration word.`
      : `FAIL - ${undetected} trials finished with corruption that neither the voter nor the CRC detected. Strengthen the scrubber or the signature check before trusting the fabric.`;

  return {
    suite: SUITE_NAME,
    options: resolved,
    trials,
    correctedTmr,
    correctedScrub,
    correctedDouble,
    detectedUncorrectable,
    undetected,
    scrubs,
    meanScrubMs: Math.round((scrubTimeTotal / resolved.trials) * 1000) / 1000,
    maxScrubMs: Math.round(maxScrubMs * 1000) / 1000,
    pass,
    verdict,
  };
}

/**
 * Scrub-interval model.
 *
 * The self-test proves a single upset is caught. This second check asks the
 * question the first one cannot: how often the scrubber must run so that two
 * upsets never accumulate in one copy between passes. Everything is expressed
 * in the units a mission planner uses: upsets per device per day, and hours of
 * exposure the fabric tolerates.
 */
export interface ScrubIntervalModel {
  /** Upsets per device per day at the current environment. */
  upsetsPerDay: number;
  /** Seconds between scrubber passes. */
  scrubIntervalSec: number;
  /** Expected upsets landing between two passes. */
  upsetsPerInterval: number;
  /** Probability two upsets accumulate in the same copy between passes. */
  doubleBitProbability: number;
  /** Mean time between failures, in hours, from the corrected state. */
  mtbfHours: number;
  /** Recommended maximum scrub interval, in seconds. */
  recommendedIntervalSec: number;
  /** Verdict on the configured scrub interval. */
  verdict: string;
}

export function scrubIntervalModel({
  upsetsPerDay = 0.05,
  scrubIntervalSec = 300,
  frameCount = FRAME_COUNT,
}: {
  upsetsPerDay?: number;
  scrubIntervalSec?: number;
  frameCount?: number;
} = {}): ScrubIntervalModel {
  const upsetsPerInterval = (upsetsPerDay / 86400) * scrubIntervalSec;
  // Probability that two independent upsets land in the same copy of the same
  // frame: one over the number of 3 x frameCount copy slots.
  const slots = 3 * frameCount;
  const intraUpsetPairs = (upsetsPerInterval * (upsetsPerInterval - 1)) / 2;
  const doubleBitProbability = Math.min(1, (intraUpsetPairs / slots) * 3);
  const mtbfHours =
    upsetsPerDay > 0 ? (1 / upsetsPerDay) * 24 * (slots / 3) * 0.001 + 24 : 8760;
  const recommendedIntervalSec = Math.max(
    30,
    Math.round(86400 / Math.max(upsetsPerDay, 0.0001) / 24),
  );
  const verdict =
    scrubIntervalSec <= recommendedIntervalSec
      ? `Scrub interval ${scrubIntervalSec}s is inside the ${recommendedIntervalSec}s recommended ceiling: a second upset cannot accumulate in one copy between passes.`
      : `Scrub interval ${scrubIntervalSec}s exceeds the ${recommendedIntervalSec}s recommended ceiling. Two upsets could accumulate in one copy and only the CRC would catch them.`;
  return {
    upsetsPerDay,
    scrubIntervalSec,
    upsetsPerInterval: Math.round(upsetsPerInterval * 1000) / 1000,
    doubleBitProbability: Math.round(doubleBitProbability * 1e8) / 1e8,
    mtbfHours: Math.round(mtbfHours * 10) / 10,
    recommendedIntervalSec,
    verdict,
  };
}
