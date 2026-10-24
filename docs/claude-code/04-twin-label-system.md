# 04 — THE 3D LABEL SYSTEM (paste this whole file)

This is the most delicate part of the codebase. Labels were the hardest thing to get
right in this project, and there are three distinct failure modes that were each fixed
once. Read this before you touch a label.

---

## 1. The behaviour that is required

1. **Nothing floats on its own.** Labels appear only because the operator asked for them.
2. **Click an object → its label appears**, carrying the live readings behind it, drawn
   at the object's position.
3. **The label carries a cross at its top right.** Clicking the cross removes that one
   label and nothing else.
4. **Clicking the label body also dismisses it.** This is a deliberate second target —
   the cross is small on a touchscreen.
5. **Clicking the same object again toggles its label off.**
6. **`Esc` clears every opened label.** So does the `clear N labels` chip in the scene
   toolbar, and so does the Layers menu entry **Remove N clicked labels**.
7. **The pinned count is always visible** so the operator never loses track of what is up.
8. **A dismissed label stays dismissed**, even while its object is hovered or selected.
   It comes back only on a fresh deliberate click.
9. **Ambient titles are opt-in.** The green telemetry strip, the amber airlock marker, the
   neighbouring-station nameplate and the room name plates sit behind
   **Place titles and telemetry strips**, which starts **off**. While walking, nothing
   floats until the switch is on.
10. **Species labels have their own switch** — **Name labels over the ice** on the field
    card, mirrored in the Layers menu as **Species name labels**. Turning it off removes
    the names over the ice but leaves the facts in the card.
11. **`L`** toggles every floating label off and on. The `labels on/off` chip does the
    same. The interior has a `Hide labels` button.

## 2. The store — `src/components/twin/scene-labels.ts` (191 lines)

A **module-level store**, not React state. The label components are scattered across both
station scenes, the interiors and the wildlife layer; a single external store is the only
way one click in the toolbar can clear a label pinned deep inside an interior room.

```ts
let pinnedIds: string[] = [];
let suppressedIds: string[] = [];
const listeners = new Set<() => void>();
```

Exported API:

| Export | Purpose |
| --- | --- |
| `getPinnedLabelIds()` | Snapshot for `useSyncExternalStore`; identity changes only when the pins change |
| `isLabelPinned(id)` | Is this object's label pinned by a click? |
| `isLabelSuppressed(id)` | Did the operator close it? |
| `pinLabel(id)` | Pin one label. **Also withdraws any earlier suppression of the same id**, so a closed label always comes back on the next deliberate click. |
| `unpinLabel(id)` | Toggle off. |
| `dismissLabel(id)` | Close via the cross, or by clicking the label body. Adds to `suppressedIds` and removes from pins. |
| `suppressLabel(id)` | Suppress without otherwise touching the pin list. |
| `toggleLabelPin(id)` | Pin if absent, unpin if present. |
| `clearPinnedLabels()` | Clear everything. Bound to `Esc`, the chip and the Layers menu. |
| `useLabelPinned(id)` | Reactive read, per component. |
| `useLabelSuppressed(id)` | Reactive read, per component. |
| `usePinnedLabelCount()` | Reactive count, for the chip. |
| `useHoverHold(holdMs = 1800)` | Grace period — see §4. |

`subscribe(listener)` adds to the listener set and returns the unsubscribe function.
`emit()` notifies all listeners. `useSyncExternalStore` is the only React binding — do
not add a second mechanism.

**When editing this file:** it must stay newline-real. Some tooling has flattened it
before into a single line with literal `\n` sequences, which produced roughly 200
TypeScript errors. After any write, check:

```bash
wc -l src/components/twin/scene-labels.ts   # expect ~191
head -4 src/components/twin/scene-labels.ts # expect real newlines
```

## 3. The renderer — `Label3D` in `src/components/twin/twin-primitives.tsx` (~line 1047)

```ts
type Label3DProps = {
  position: [number, number, number];
  rows: [string, string][];          // [label, value] pairs rendered as the label body
  border: string;                   // status colour for the border
  px: number;                       // on-screen pixel height of the label
  renderOrder?: number;
  ambient?: boolean;                // is this an ambient title rather than a clicked label?
  onDismiss?: () => void;
  requested?: boolean;              // is this label currently requested (pinned or allowed)?
};
```

**The cross size is the fix for failure mode A:**

```ts
const crossSize = Math.min(6, Math.max(1.25, height * px * 0.32));
```

A fixed world-space cross was invisible next to a large label and looked like a speck
next to a small one. It is now derived from the label's own pixel height, clamped so it
stays between 1.25 and 6 world units.

`getDismissTexture` (~line 1009) draws the ✕ once into a canvas texture and caches it —
do not regenerate a texture per frame or per label.

Clicking the sprite body calls `onDismiss`. Both targets must work.

**Ambient gating**: an ambient label renders only when `display.titles` or
`display.deckPlan` is on. In walk mode a label is suppressed entirely unless `titles` is
on or the operator explicitly requested it.

`TwinDisplayState` (~lines 227–261) is the console's layer state:

```ts
labels: true,   // the click-to-label system is live
titles: false,  // ambient titles start OFF — do not flip this default
```

## 4. The hover grace period — `useHoverHold`

**Failure mode B:** a hover label vanished while the pointer was travelling toward its
cross. The pointer left the hotspot, the hotspot un-hovered, the label unmounted, and the
click landed on nothing.

`useHoverHold(holdMs)` keeps the label alive for `holdMs` after the pointer leaves, so
the pointer can reach the cross. Defaults and overrides:

| Call site | Value |
| --- | --- |
| `src/components/twin/wildlife/Wildlife.tsx` | default `1800` |
| `src/components/twin/interiors/kit.tsx` (`Interactive`, ~line 230–300) | `900` |

Interior objects need less because interiors are dense and the pointer has further to
travel. If you add a new hoverable label, use the default and only pass a value if you
have a measured reason.

**Failure mode C:** the cross had no target at all — some labels had no dismiss handler.
Every label component now passes `onDismiss={() => dismissLabel(pinId)}`. If you add a
label, wire both `onDismiss` and `requested={pinned}`.

## 5. Every wiring site — all four must stay wired

| File | Component | Line (approx) |
| --- | --- | --- |
| `src/components/twin/twin-primitives.tsx` | `Hotspot` | ~348 / ~434 |
| `src/components/twin/interiors/kit.tsx` | `Interactive` | ~230–300 |
| `src/components/twin/wildlife/Wildlife.tsx` | `ExpeditionMember` | ~885–975 |
| `src/components/twin/wildlife/Wildlife.tsx` | `Colony` | ~1012–1185 |

Each passes `onDismiss={() => dismissLabel(pinId)}` and `requested={pinned}`. Each reads
`useLabelPinned(id)` and `useLabelSuppressed(id)` and calls `useHoverHold()`.

## 6. Console controls — `src/pages/Twin.tsx` (2093 lines)

| Control | Where | Behaviour |
| --- | --- | --- |
| `Esc` key handler | ~line 570 | `clearPinnedLabels()` |
| `L` key | — | Toggle every floating label off and on |
| `clear N labels` chip | scene toolbar | Same as `Esc`; N comes from `usePinnedLabelCount()` |
| `labels on/off` chip | scene toolbar | Mirror of `L` |
| Layers menu | `src/components/twin/navigation/TwinNav.tsx` | **Remove N clicked labels**, **Place titles and telemetry strips**, **Species name labels** |
| `Hide labels` | interior view | Interior-scoped strip |
| **Name labels over the ice** | wildlife field card | Per-card species name switch |

The toolbar is deliberately decluttered: view modes, camera presets and layer switches
live in three compact menus, not open columns. Do not add a fourth floating column.

## 7. Adding a new label — the checklist

1. Give it a **stable string id** (the object name plus the station slug, e.g.
   `maitri:generator-hall`). Ids are how a dismiss survives a re-render.
2. `const pinned = useLabelPinned(id);`
3. `const suppressed = useLabelSuppressed(id);`
4. `useHoverHold()` (or a measured value for dense interiors).
5. `onClick` → `toggleLabelPin(id)`.
6. `<Label3D … requested={pinned || allowed} onDismiss={() => dismissLabel(id)} />`.
7. If it is ambient, gate on `display.titles` (and `display.deckPlan` indoors).
8. If it is a species name, also respect the **Name labels over the ice** switch.
9. If it is a hotspot, add it to `Hotspot` in `twin-primitives.tsx` rather than
   duplicating the hotspot logic.
10. Check all four dismissal paths by hand: cross, label body, second click, `Esc`.

## 8. Things that will look right and be wrong

- A label that renders only on hover but has no cross — it cannot be closed without
  moving the pointer away, which reads as "it ignores me".
- A cross drawn at a fixed world size — invisible on big labels, a speck on small ones.
- A label that reappears when the object is merely selected — that is the suppression
  rule being skipped.
- Ambient titles that are on by default — the site is supposed to start clean.
- Two copies of the pinned list, one in React state and one in the module store — they
  will disagree, and the chip count will be wrong.
