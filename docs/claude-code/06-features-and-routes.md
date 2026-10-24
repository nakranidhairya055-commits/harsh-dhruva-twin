# 06 — FEATURES AND ROUTES (paste this whole file)

A per-screen map of the command centre. Every one of these is implemented and working.
When you change one, this file's description of it is the contract.

The product is **20 command screens** plus 2 public marketing/legal pages.

---

## Public

| Route | File | What it is |
| --- | --- | --- |
| `/` | `src/pages/Landing.tsx` (601) | The poster. Badges, wordmark, coordinates line, CTAs to `/dashboard` and `/auth?returnTo=%2Fadvisor`, capability grid, penguin band, identity strip, footer |
| `/terms` | `src/pages/Terms.tsx` (186) | Public legal, inside `LegalShell` |
| `/privacy` | `src/pages/Privacy.tsx` (175) | Public legal, inside `LegalShell` |
| `/auth` | `src/pages/Auth.tsx` (320) | Email one-time code, guest session, consent line linking both legal docs, `redirectAfterAuth="/dashboard"` |
| `*` | `src/pages/NotFound.tsx` | — |

## Command screens

### 1. Sensor Dashboard — `/dashboard`, `src/pages/Dashboard.tsx`
Ten second tick refreshes every channel. Featured chart opens. Calls `bootstrap.ensureSeeded`
on first load so the platform seeds itself.

### 2. Alert Triage and Incident Matrix — `/alerts`, `src/pages/Alerts.tsx`
The incident matrix, acknowledge a critical, resolve a warning. Drills run at warning or
above raise the crew-risk node here as a real incident.

### 3. Station Dashboard — `/station`, `src/pages/StationOps.tsx`
Personnel roster, badge state, duty board, queue a roll call.

### 4. Microgrid and CHP Command — `/microgrid`, `src/pages/Microgrid.tsx`
Load versus supply, thermal recovery, plant advisories. Maitri's four 62.5 kVA gensets and
Bharati's three CHP units.

### 5. Local Environment — `/environment`, `src/pages/Environment.tsx`
Ice velocity map, weather series, satellite passes.

### 6. Digital Twin 3D — `/twin`, `src/pages/Twin.tsx` (2093 lines)
The largest surface in the product. Station switch (Maitri / Bharati), seven view modes,
2.5D cutaway, drone tour, teleport menu (`T`), time of day, walk-the-site, layers menu,
label chips, `Esc` handler (~line 570), site walk, `FieldBadge`, and a focus action for
Dev Khandhediya. See document 04 for the label system and document 01 §4 for the scene
inventory.

### 7. Antarctica Overview — `/antarctica`, `src/pages/Antarctica.tsx`
The station network picture, including Dakshin Gangotri and the Maitri-II plan.

### 8. Weather Extension — `/weather`, `src/pages/Weather.tsx`
Open-Meteo, keyless. 24 h temperature in cyan, 24 h wind in amber, 7 day pressure in
violet, 7 day forecast strip. Falls back to the station AWS series if the endpoint is down.

### 9. Antarctic Mode — `/antarctic`, `src/pages/AntarcticMode.tsx`
A separate high-contrast field interface, not a theme. Trigger from the top nav,
`Ctrl+Shift+A`, or automatically at −20 °C or ≥80 km/h. Home, Tasks, Report Issue,
Check-In, Vehicle Log, Weather, full-screen SOS with GPS.

### 10. AI Advisor — `/advisor`, `src/pages/Advisor.tsx` (557)
Grounded briefing generated on arrival. Headline, risk level, 3–6 ranked actions with owner
and window, watch list, evidence panel. Six focus areas: daily briefing, power and heat,
the water path, connectivity, the sea lift, field safety. Follow-up questions go to the
same assistant with the same live context.

### 11. Cascade Drill — `/cascade`, `src/pages/Cascade.tsx` (662)
Failure propagation drawn as a swimlane **flowchart**, not a scatter. Click any box to shut
that system down; the whole chart recomputes. Backed by `src/convex/cascadeGraph.ts`
(pure engine) and `src/convex/cascade.ts` (persistence + audit).

### 12. Repair Bay — `/repair`, `src/pages/Repair.tsx`
Live fault queue derived from the channels, step-by-step procedures that actually close
incidents and write a corrected sample back into band, plus the FPGA TMR self-test with
PASS/FAIL verdicts, the per-trial table and the scrub interval planner. Backed by
`src/lib/fpga.ts` and `src/convex/repairs.ts`.

### 13. Resupply Voyage — `/resupply`, `src/pages/Resupply.tsx` (702)
The live supply-ship tracker. One clock in `src/lib/voyage.ts` drives position, course,
distance run, remaining, countdown, noon reports, ice state and passage progress. Keyless
Google Maps satellite embed that re-anchors every 90 s, a Google Earth deep link, a
timeline scrubber, and a built-in route chart drawn from the same geometry. **Never add a
second clock or hard-code a position.**

### 14. NCPOR Library — `/library`, `src/pages/Library.tsx`
Treaty, policy, standards and field manuals.

### 15. NPDC Compliance Centre — `/compliance`, `src/pages/Compliance.tsx`
CF-1.11 standard names, GCMD keywords, validation against `NPDC-DS-01`, schema.org Dataset
JSON-LD export, every export audited. Logic in `src/lib/npdc.ts`.

### 16. Expedition Logs — `/expeditions`, `src/pages/Expeditions.tsx`
The ISEA expedition series (46 expeditions on the public identity strip).

### 17. Audit Trail — `/audit`, `src/pages/Audit.tsx`
The hash-chained command log: head digest, verified chain, export records. Editing,
inserting or reordering any entry breaks the chain and is shown as broken.

### 18. Equipment Catalog — `/catalog` and `/equipment/:equipmentId`
`src/pages/Catalog.tsx`, `src/pages/EquipmentDetail.tsx`. The instrumented-systems registry.

### 19. Workspace — `/workspace`, `src/pages/Workspace.tsx`
Publishing observations and managing contributions.

### 20. Admin Console — `/admin`, `src/pages/Admin.tsx`
Platform administration. Role gating applies here.

## Cross-cutting UI

| Component | File | Role |
| --- | --- | --- |
| App shell | `src/components/AppShell.tsx` (620) | Nav, role switcher, sync dropdown, footer legal links |
| Assistant dock | `src/components/AssistantDock.tsx` | `Ctrl`/`Cmd + K` opens, `Esc` closes, opens with "Guide me through the console from the start." |
| Auth guard | `src/components/RequireAuth.tsx` | Preserves the path in `/auth?returnTo=…` |
| Legal shell | `src/components/LegalShell.tsx` (236) | Shared `/terms` + `/privacy` chrome |
| Station link | `src/components/StationLinkProvider.tsx` | Cross-station navigation |
| Role view | `src/hooks/use-role-view.ts`, `src/lib/roles.ts` | Admin / Commander / Scientist / Station |
| Blackout | `src/hooks/use-blackout.ts` | Continuity prediction widget and simulation |
| Time of day | `src/hooks/use-time-of-day.ts` | Solar geometry per latitude |
| Field badge | `src/components/twin/FieldBadge.tsx` | 19 badges, 4 tracks, XP and levels |

## Shared libraries

| File | Role |
| --- | --- |
| `src/lib/station.ts` | `PROJECT_IDENTITY`, station list/slugs, all time formatters, status and severity classes, subsystem labels |
| `src/lib/assistant-fast.ts` (405) | Instant local answers: screen routing, the 8-step walkthrough, click-to-label, badges, how the model key works |
| `src/lib/predictive-risk-engine.ts` | Deterministic risk scoring: score 0-100, findings with evidence, top systems, 24 h outlook from trend slopes. Pure, offline-safe, no key. Consumable by both AI engines so they stay one shape |
| `src/lib/voyage.ts` | The one voyage clock, route geometry, waypoints, ice edge |
| `src/lib/fpga.ts` | TMR bitstream simulation, voter, scrubber, CRC, interval planner |
| `src/lib/mqtt.ts` | HiveMQ client, topic helpers, connection state |
| `src/lib/offline-queue.ts` | IndexedDB priority outbox, SOS 1 → Routine 4 replay |
| `src/lib/achievements.ts` | 19 badges in 4 tracks, XP, local-storage progress |
| `src/lib/npdc.ts` | CF-1.11 / GCMD tagging, NPDC-DS-01 validation, JSON-LD export |
| `src/lib/roles.ts` | Role definitions and capability gating |
| `src/lib/catalog.ts` | Equipment catalog data |
| `src/lib/utils.ts` | `cn()` |

## Rules when adding a screen

1. Create `src/pages/<Name>.tsx`, lazy import it in `src/main.tsx`, wrap in `RequireAuth`
   with a real title and description, add the nav entry in `AppShell.tsx`.
2. Keep the screen useful with no model key configured.
3. Make it work offline, or degrade visibly and say so.
4. No empty states without explanation. No disabled controls without a reason.
5. Re-run verification (document 09) before you call it done.
