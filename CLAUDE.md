# CLAUDE.md — DhruvaTwin

> Working rules for Claude Code (and any other coding agent) on this repository.
> The longer, pasteable prompt set lives in `docs/claude-code/`. Read
> `docs/claude-code/00-START-HERE.md` first if you are new.

## 1. What this project is

**DhruvaTwin** — an offline-first Digital Twin platform for the two Indian Antarctic
research stations, built for Smart India Hackathon 2026.

| Field | Value |
| --- | --- |
| Name | **DhruvaTwin** (always spelled exactly this way) |
| Team | **HackFinity007** (always spelled exactly this way) |
| PS ID | 26060 |
| Theme | Smart Automation |
| Category | Software |
| Event | Smart India Hackathon 2026 |
| Agency | NCPOR — National Centre for Polar and Ocean Research, MoES |

**Maitri** — 1989, Schirmacher Oasis, Central Dronning Maud Land, `70°45'52"S 11°44'03"E`.
**Bharati** — 2012, Larsemann Hills, North Grovnes Island, `69°24'41"S 76°11'15"E`.
The two are **3,098 km** apart.

Dakshin Gangotri (buried) and the planned Maitri-II replacement also appear in the
network picture.

Single source of truth for all of that identity: `src/lib/station.ts` →
`PROJECT_IDENTITY`. Change it there, never inline.

## 2. Stack (do not substitute)

- **Build**: Vite 7, Bun, TypeScript 5.9 strict
- **UI**: React 19, React Router 7, Tailwind CSS v4, shadcn/ui (Radix), Framer Motion, Recharts, lucide-react
- **3D**: three.js 0.186 + `@react-three/fiber` 9 + `@react-three/drei` 10
- **Backend / database**: **Convex** (`convex` 1.30) — queries, mutations, actions, crons
- **Auth**: Convex Auth, **email one-time code** + anonymous guest sessions (no passwords anywhere)
- **Transport**: MQTT over WebSocket to `broker.hivemq.com`, IndexedDB priority outbox
- **Hosting**: Vly / Freebuff platform. Convex deployment: `https://accurate-bird-410.convex.cloud`

There is exactly one React copy, one Tailwind, one shadcn/ui. Never add a second.

## 3. Commands

```bash
bun install
bunx tsc -b --noEmit        # typecheck — must exit 0
bun convex dev --once       # push Convex functions + regenerate _generated (NEVER bare `convex dev`)
bun run scan:secrets       # credential-shape + structural secret scan — must print "Secret scan passed"
bun run lint
```

`bun run build` is a full production build. Do not run it unless explicitly asked.

**Never** start, stop, kill or restart the dev server, the preview, or the Convex
dev process. The platform owns them. Edits are picked up automatically. A stale or
blank preview means a real code or type error — fix the code, do not restart anything.

## 4. Non-negotiable rules

1. **No credential in the browser.** Every provider key is read via `process.env`
   inside a Convex `"use node"` action. `process.env` outside `src/convex/` is a scan
   failure. The only permitted values under `VITE_*` are `VITE_CONVEX_URL`,
   `VITE_VLY_APP_ID` and `VITE_VLY_MONITORING_URL`.
2. **Never edit `.env` files.** The user manages secrets in the platform Keys/API keys UI.
3. **Never hand-edit `src/convex/_generated/*`.** Run `bun convex dev --once` and fix the real source error.
4. **Never touch `server.hmr` in `vite.config.ts`.** Freebuff requires `hmr: false` and forbids adding or duplicating HMR settings.
5. **No TODOs, no FIXME, no "coming soon" placeholders, no stub components.** Everything renders real content.
6. **Every Convex mutation takes validated arguments** and every operational action appends to the hash-chained audit log.
7. **Routes are lazy loaded** in `src/main.tsx`. Every authenticated route is wrapped in `RequireAuth` with a real `title` and `description`.
8. **Do not shadow React hooks.** Import hooks only from `react`. Never name a variable, prop, or import `useMemo`, `useState`, `useEffect`, or `React`. Never call hooks conditionally, in loops, in callbacks, or outside components/custom hooks.
9. **Edit existing files over creating new ones.** Reuse `src/components/ui/*`, `src/components/panels.tsx`, `AppShell`, `LegalShell`.
10. **Use valid Tailwind classes only.** No invented utilities like `h-4.5`. Stay inside the CSS token system in `src/index.css`.

## 5. Secrets, concretely

- `GROQ_API_KEY` — read at `src/convex/assistant.ts` and `src/convex/advisor.ts`.
  It is set in the platform **Keys** UI. If the key is absent both surfaces fall back
  to a deterministic rule engine and **say which engine answered** — a missing key is
  visible, never silent.
- Everything else (Open-Meteo, the Google Maps / Google Earth embed, HiveMQ) is
  **keyless by design**. Do not add a browser-side map key. If a Maps JavaScript key is
  ever added it is a public referrer-restricted key and must never hold a secret.
- `scripts/scan-secrets.mjs` is the guard rail: 10 credential-shape patterns plus two
  structural rules. Run it before declaring any task done.

## 6. Design system (short version)

Dark polar-night palette, defined once in `src/index.css`:

| Token | Value |
| --- | --- |
| `--background` | `#060B14` |
| `--card` / `--popover` | `#0A121E` |
| `--primary` | `#00E0C6` (ice teal) |
| `--secondary` | `#111C2B` |
| `--muted` | `#0F1826` |
| `--muted-foreground` | `#6B7A8F` |
| `--accent` | `#101B2A` |
| `--destructive` | `#FF3B47` |
| `--border` | `#1A2533` |
| charts 1–5 | `#00E0C6`, `#FFB020`, `#4A9EFF`, `#FF3B47`, `#3EE07F` |

Status colours are centralised in `src/lib/station.ts` → `statusClasses()` and
`severityClasses()`: critical `#FF3B47`, warning `#FFB020`, watch `#4A9EFF`,
nominal `#3EE07F`. Use them, do not invent new status colours.

`src/main.tsx` must keep `import "./index.css"`, the `RootErrorBoundary`, the
`ToolbarErrorBoundary`, `ConvexAuthProvider`, and `BrowserRouter`. Breaking any of
those produces a blank preview.

## 7. Accuracy rules

- Station facts (coordinates, established year, name, capacity) come from `README.md`
  and `src/lib/station.ts`. Do not invent new ones.
- Wildlife is placed **honestly by geography**: Bharati is coastal and carries marine
  fauna; Maitri is ~100 km inland and carries only oasis fauna. Never put whales at
  Maitri. Species list is `src/components/twin/wildlife/wildlife-data.ts` (22 species).
- Voyage positions, distances, ETAs and noon reports on `/resupply` all derive from one
  clock in `src/lib/voyage.ts`. Never hard-code a second clock.
- Every claim the advisor makes must trace to a listed evidence fact. Never let the AI
  path and the rule-engine path produce different shapes.

## 8. Definition of done

```bash
bunx tsc -b --noEmit        # 0 errors
bun convex dev --once       # "Convex functions ready!"
bun run scan:secrets       # "Secret scan passed"
```

Plus: no `TODO`/`FIXME` anywhere in `src/`, `scripts/`, `README.md`, `SECURITY.md`;
the page you touched renders; the route you added exists and is reachable from the nav
or a footer; a signed-out user hitting it lands on `/auth?returnTo=<path>` and a
signed-in user lands on the destination, never back on `/`.
