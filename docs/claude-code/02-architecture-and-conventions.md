# 02 — ARCHITECTURE AND CONVENTIONS (paste this whole file)

---

## 1. File layout

```
src/
  main.tsx                     entrypoint: providers, error boundaries, router, lazy routes
  index.css                    Tailwind v4 + the entire design token set
  App.tsx / instrumentation.tsx platform wiring — do not restructure
  pages/                       one file per route (lazy loaded)
  components/
    ui/                        shadcn/ui — use these, do not hand-roll replacements
    ui/index.ts                barrel export for shadcn components
    panels.tsx                 shared console panel primitives
    AppShell.tsx               signed-in chrome: nav, sync dropdown, footer legal links
    AssistantDock.tsx          the station assistant dock
    RequireAuth.tsx            auth guard
    LegalShell.tsx             shared shell for /terms and /privacy
    StationLinkProvider.tsx    cross-station linking
    landing/                   AntarcticPoster.tsx, PenguinSvg.tsx
    twin/                      the 3D world
      twin-primitives.tsx      Label3D, Hotspot, TwinDisplayState, shared geometry
      scene-labels.ts          pinned-label store + useHoverHold
      site-walk.ts             WalkController for the exterior
      drone-tours.ts           scripted tour data
      view-modes.tsx           the seven engineering view modes
      types.ts                 shared twin types
      FieldBadge.tsx           badge UI
      TwinPanels.tsx           right-rail panels
      MepOverlay.tsx           MEP / HVAC overlay
      TwoAndHalfD.tsx          the 2.5D cutaway
      VehicleFleet.tsx         the 12 vehicle classes
      MaitriScene.tsx          Maitri exterior
      BharatiScene.tsx         Bharati exterior
      interiors/
        plans.ts, plan-types.ts  the floor plans — single source of geometry
        rooms.ts                room registry
        rooms-ops.tsx           ops rooms incl. TwinAdminDesk
        rooms-living.tsx        living quarters
        InteriorSystem.tsx     mounts the interior world
        WalkController.tsx      first-person interior movement
        kit.tsx                 Interactive, door, light switch, furniture kit
        Occupant.tsx            walking crew figures
        furniture.tsx           furniture library
      water/                    WaterBody, UnderwaterView, IcebergTracker, water-data
      wildlife/                 Wildlife.tsx, WildlifePanel.tsx, wildlife-data.ts
      navigation/TwinNav.tsx    the decluttered viewport menus
  convex/                      backend — see document 03
  hooks/                       use-auth, use-blackout, use-mobile, use-role-view,
                               use-station-link, use-time-of-day
  lib/                         station.ts, catalog.ts, roles.ts, npdc.ts, fpga.ts,
                               voyage.ts, mqtt.ts, offline-queue.ts, achievements.ts,
                               assistant-fast.ts, utils.ts, vly-integrations.ts
scripts/scan-secrets.mjs        credential scanner (bun run scan:secrets)
docs/claude-code/              this prompt set
CLAUDE.md                      short-form agent rules, auto-loaded
SECURITY.md                    full security model
```

## 2. Conventions

- **Formatting**: Prettier defaults, double quotes, semicolons, trailing commas.
  2-space indent. Match the file you are editing rather than reformatting the repo.
- **Imports**: `@/` alias for `src/`. Types imported with `import type` where the
  import is type-only. Keep import order stable (platform, libs, local).
- **Naming**: PascalCase components and files, camelCase functions and vars,
  SCREAMING_SNAKE for module constants, `useX` for hooks, `*Classes()` for style maps.
- **Comments**: explain *why*, not *what*. Every non-obvious module gets a block
  comment at the top explaining the model. Do not narrate obvious code.
- **Types**: no `any`. Use explicit prop interfaces. Prefer unions over enums
  (`type StationSlug = "maitri" | "bharati"` is already the pattern in
  `src/lib/station.ts`).
- **Error handling**: every Convex mutation validates its args with `v.*` validators,
  checks auth where needed, and throws a specific `Error` message. Client fetches
  degrade gracefully with a real fallback, never a blank.

## 3. React rules (violating these causes a blank preview)

```tsx
// GOOD
import { useMemo, useState } from "react";
function Panel({ items }: { items: string[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => items.filter((i) => i.includes(q)), [items, q]);
  return <div>{filtered.length}</div>;
}
```

- Import hooks only from `react`. Never shadow `React`, `useMemo`, `useState`,
  `useEffect`, `useCallback`, `useRef` with a variable, prop, import or helper.
- Never call hooks conditionally, inside loops, inside callbacks, outside a component
  or a custom hook, or after an early return.
- No dynamic `import("react")`, no second React copy, no hand-rolled context that
  bypasses the app provider tree.
- Error boundary behaviour lives in `src/main.tsx`: `RootErrorBoundary` renders a
  readable error instead of a blank page; `ToolbarErrorBoundary` disables only the
  platform toolbar. Keep both.

## 4. Styling rules

- All colour comes from the tokens in `src/index.css`. No hard-coded hex in a
  component unless it is art (the poster SVG, the penguins) or a status colour that
  already exists in `src/lib/station.ts`.
- Keep `@tailwind base; @tailwind components; @tailwind utilities;` and the token
  blocks intact when editing `src/index.css`. Add tokens; do not delete the foundation.
- `src/main.tsx` must keep `import "./index.css"`. Removing it strips all styles.
- Dark mode is the default and the `.dark` block mirrors `:root`. Keep both in sync.
- Use `cn()` from `src/lib/utils.ts` for conditional class merging.
- Motion: Framer Motion for entrances and layout. Keep transitions under ~400 ms
  except deliberate 3D camera flights, which are ~1 s.

## 5. Routing and auth

`src/main.tsx` owns the router. Every page is `lazy(() => import(...))` inside a
`<Suspense fallback={<RouteLoading />}>`.

| Route | Guard | Notes |
| --- | --- | --- |
| `/` | public | poster landing |
| `/auth` | public | `redirectAfterAuth="/dashboard"` — never point this at `/` |
| `/terms`, `/privacy` | public | reachable from every footer |
| `/dashboard` | `RequireAuth` | Sensor Dashboard |
| `/alerts` | `RequireAuth` | Alert Triage + Incident Matrix |
| `/station` | `RequireAuth` | Station Dashboard, roster, duty board |
| `/microgrid` | `RequireAuth` | Microgrid and CHP Command |
| `/environment` | `RequireAuth` | Local Environment, ice velocity |
| `/twin` | `RequireAuth` | Digital Twin 3D |
| `/antarctica` | `RequireAuth` | station network overview |
| `/weather` | `RequireAuth` | Weather Extension |
| `/antarctic` | `RequireAuth` | Antarctic Mode |
| `/advisor` | `RequireAuth` | AI advisor |
| `/cascade` | `RequireAuth` | Cascade drill |
| `/repair` | `RequireAuth` | Repair bay + FPGA self-test |
| `/resupply` | `RequireAuth` | Supply-ship tracker |
| `/library` | `RequireAuth` | NCPOR Library |
| `/compliance` | `RequireAuth` | NPDC Compliance Centre |
| `/expeditions` | `RequireAuth` | Expedition Logs |
| `/audit` | `RequireAuth` | Audit Trail |
| `/catalog` | `RequireAuth` | Equipment Catalog |
| `/equipment/:equipmentId` | `RequireAuth` | Equipment detail |
| `/workspace` | `RequireAuth` | Workspace |
| `/admin` | `RequireAuth` | Admin Console |
| `*` | public | `NotFound` |

Rules:

- Every `RequireAuth` gets a real `title` and `description` explaining what the screen
  holds — not a generic "please sign in".
- A signed-out user hitting a protected route lands on `/auth?returnTo=<full path>`
  and a successful sign-in returns them to that path. Verify both directions.
- `/auth`'s `redirectAfterAuth` is `/dashboard` and stays that way for a product with
  an authenticated workspace.
- Adding a page means adding the nav entry in `src/components/AppShell.tsx` in the same
  change, or the page is unreachable.

## 6. Offline-first rules

- Anything the user creates goes into the IndexedDB outbox
  (`src/lib/offline-queue.ts`) **before** any network attempt.
- Priority classes: **SOS 1, Critical 2, Check-in 3, Routine 4**. Replay is
  highest-first.
- The twin, Antarctic Mode, the wildlife sighting log, the badge progress and the
  offline sync indicator must all work with the network down. If a feature cannot work
  offline, it must degrade visibly and say so.

## 7. Performance rules (this project is 3D-heavy)

- Model detail is mounted **per view**, not per scene. The interior world replaces the
  exterior rather than living inside it.
- `TwinDisplayState` (`src/components/twin/twin-primitives.tsx`) defaults to
  `labels: true, titles: false`. Do not turn ambient titles back on by default.
- Keep particle counts where they are (5,000 / 6,000 snow points, 800 / 1,200 stars)
  unless profiling says otherwise.
- Prefer `useMemo` for derived scene data; never rebuild a geometry array per frame.
- Lazy load routes (already done) and lazy load heavy panels inside the twin.
