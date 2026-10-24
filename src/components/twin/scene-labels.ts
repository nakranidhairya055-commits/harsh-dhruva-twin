import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Pinned scene labels.
 *
 * Every floating label inside the WebGL scene is off until the operator asks
 * for it. There are two ways to ask: the Titles layer switch in the console,
 * which turns the whole ambient set on, and clicking an object in the scene.
 * A click pins that one label, which then stays on screen with its own cross
 * so it can be removed again without touching anything else.
 *
 * The pins live in a module-level store rather than in React state because the
 * label components are scattered across both station scenes, the interiors and
 * the wildlife layer. A single store lets any of them answer to one click and
 * lets the console clear the lot from one place.
 */
let pinnedIds: string[] = [];
/**
 * Labels the operator closed with the cross on the label itself. A suppressed
 * label stays off the screen even while its object is hovered or selected, so
 * closing a label is final until the operator clicks the object again. This is
 * what makes every label in the scene removable at any time, hover labels
 * included.
 */
let suppressedIds: string[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot for useSyncExternalStore. Identity only changes with the pins. */
export function getPinnedLabelIds(): string[] {
  return pinnedIds;
}

/** True when this object's label was pinned by a click. */
export function isLabelPinned(id: string): boolean {
  return pinnedIds.includes(id);
}

/**
 * Pin one label. Called when an object is clicked.
 *
 * Clicking an object also withdraws any earlier dismissal of its label, so a
 * closed label always comes back on the next deliberate click.
 */
export function pinLabel(id: string): void {
  const hadSuppression = suppressedIds.includes(id);
  if (hadSuppression) suppressedIds = suppressedIds.filter((entry) => entry !== id);
  if (pinnedIds.includes(id)) {
    if (hadSuppression) emit();
    return;
  }
  pinnedIds = [...pinnedIds, id];
  emit();
}

/** Remove one label. Called by the cross drawn on the label itself. */
export function unpinLabel(id: string): void {
  if (!pinnedIds.includes(id)) return;
  pinnedIds = pinnedIds.filter((entry) => entry !== id);
  emit();
}

/** True when the operator closed this label with its cross. */
export function isLabelSuppressed(id: string): boolean {
  return suppressedIds.includes(id);
}

/**
 * Close a label until its object is clicked again.
 *
 * Used for labels that are on screen because the object is hovered or
 * selected rather than pinned: without this the cross would have nothing to
 * do for a label the operator never opened themselves.
 */
export function suppressLabel(id: string): void {
  if (suppressedIds.includes(id)) return;
  suppressedIds = [...suppressedIds, id];
  emit();
}

/**
 * The cross on a label: take it off the screen now.
 *
 * Unpins it if it was pinned, and suppresses it either way, so the label stays
 * removed rather than reappearing on the next hover.
 */
export function dismissLabel(id: string): void {
  unpinLabel(id);
  suppressLabel(id);
}

/** Click behaviour: first click pins, a second click on the same object clears. */
export function toggleLabelPin(id: string): void {
  if (pinnedIds.includes(id)) {
    unpinLabel(id);
    return;
  }
  pinLabel(id);
}

/** Clear every clicked label at once, and every earlier dismissal with it. */
export function clearPinnedLabels(): void {
  if (pinnedIds.length === 0 && suppressedIds.length === 0) return;
  pinnedIds = [];
  suppressedIds = [];
  emit();
}

/**
 * True when this object's label is currently pinned, reactive.
 *
 * The snapshot is a primitive, so React re-renders only the label whose pin
 * actually changed. Every fixture in both interiors subscribes to this, and a
 * boolean snapshot keeps a click from re-rendering the whole deck.
 */
export function useLabelPinned(id: string | undefined): boolean {
  const snapshot = useCallback(() => (id ? isLabelPinned(id) : false), [id]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * True when this object's label was closed with its cross, reactive.
 * A primitive snapshot again, so only the label that changed re-renders.
 */
export function useLabelSuppressed(id: string | undefined): boolean {
  const snapshot = useCallback(() => (id ? isLabelSuppressed(id) : false), [id]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Count of pinned labels, reactive, for the console chip. */
export function usePinnedLabelCount(): number {
  const snapshot = useCallback(() => pinnedIds.length, []);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Hover state that survives the trip to the cross.
 *
 * A hover label floats above the thing it names, so there is a band of empty
 * scene between the object and the label. Moving the pointer up to the cross
 * crosses that band, which drops the hover, which hides the label, which takes
 * the cross away before it can be clicked. That is why operators could not
 * remove labels that appear on hover, and it is a fault of the interaction, not
 * of the operator.
 *
 * Holding the hover open for a short grace period after the pointer leaves
 * fixes it: the label stays put long enough to reach the cross, and entering
 * the label cancels the countdown, so it stays while the pointer is on it.
 */
export function useHoverHold(holdMs = 1800): {
  hovered: boolean;
  over: () => void;
  out: () => void;
} {
  const [hovered, setHovered] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const over = useCallback(() => {
    clear();
    setHovered(true);
  }, [clear]);

  const out = useCallback(() => {
    clear();
    timer.current = setTimeout(() => {
      timer.current = null;
      setHovered(false);
    }, holdMs);
  }, [clear, holdMs]);

  useEffect(() => clear, [clear]);

  return { hovered, over, out };
}
