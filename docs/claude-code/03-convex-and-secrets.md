# 03 — CONVEX BACKEND AND SECRETS (paste this whole file)

---

## 1. The one rule that matters most

**No credential may ever reach the browser.**

- Provider keys are read with `process.env` **inside a Convex `"use node"` action**.
  `"use node"` is what makes the module run on the Node backend and bundle
  `process.env` there. Without it, `process.env` does not exist.
- Nothing under `src/` outside `src/convex/` may read `process.env`. The secret scan
  fails the build if it does.
- The only `VITE_*` values permitted in this project are `VITE_CONVEX_URL`,
  `VITE_VLY_APP_ID` and `VITE_VLY_MONITORING_URL`. They are public identifiers.
- Never add a `VITE_*` variable whose name matches `KEY|SECRET|TOKEN|PASSWORD|PASSWD|
  CREDENTIAL|AUTH`. Vite inlines those into the client bundle permanently.
- Never write a key into a file, a comment, a commit message, or a chat prompt.

## 2. Where the key lives today

`GROQ_API_KEY`, read in two places:

- `src/convex/assistant.ts` — the station assistant
- `src/convex/advisor.ts` — the AI station advisor

It is set in the platform **Keys / API keys** UI, not in a file. The assistant and
advisor both check for it at runtime and fall back to a deterministic rule engine when
it is absent, **and both state which engine answered**.

> **Known open issue.** The key currently in the Keys UI is named `Groq`, while the
> code reads `process.env.GROQ_API_KEY`. They do not match, so the model path is not
> being taken. Rename the key in the UI to `GROQ_API_KEY` (preferred, zero code
> change), or make the two actions read
> `process.env.GROQ_API_KEY ?? process.env.Groq`. Do not leave it.

**Every other integration is keyless by design and must stay that way:**

| Integration | Why there is no key |
| --- | --- |
| Open-Meteo weather | public endpoint, no key |
| Google Maps satellite embed on `/resupply` | keyless embed, no Maps credential at all |
| Google Earth deep link | URL only |
| HiveMQ public broker | public broker, `broker.hivemq.com` |

If a Maps JavaScript API key is ever added it is a **public, referrer-restricted browser
key**, it must be restricted by HTTP referrer at Google, and it must never hold a secret.

## 3. Convex module map

| Module | Responsibility |
| --- | --- |
| `schema.ts` | Tables: stations, telemetry, alerts, personnel, microgrid, weather, satellite passes, command logs, documents, expeditions, blackout events, NPDC exports, cascade runs, repair log, wildlife sightings, self-tests |
| `sensors.ts` | Single source of truth for equipment, thresholds and the simulation model |
| `telemetry.ts` | Ten second simulation tick, live readings, history, alert lifecycle |
| `ops.ts` | Rosters, microgrid, weather, satellite passes, ice velocity, sixty second ops tick |
| `records.ts` | Hash-chained audit log, NCPOR library, expeditions, NPDC exports |
| `blackout.ts` | Continuity prediction, blackout simulation, reconciliation |
| `cascadeGraph.ts` | **Pure** dependency model and deterministic propagation engine, shared by server and console |
| `cascade.ts` | Cascade drill execution, persistence, audit logging |
| `repairs.ts` | Telemetry repair procedures, repair log, FPGA self-test recording |
| `wildlife.ts` | Sighting log per station, census, per-species totals read by the twin |
| `assistant.ts` | Groq station assistant with live context injection and general knowledge |
| `advisor.ts` | Grounded briefings over live context, by model or by rule engine |
| `users.ts`, `admin.ts` | User records and platform administration |
| `seed.ts` | Idempotent seeding of stations, telemetry, rosters, plant history, passes, library, expeditions, audit chain |
| `bootstrap.ts` | `bootstrap.ensureSeeded` — runs once, called from the dashboard |
| `crons.ts` | Ten second sensor tick, sixty second operations tick |
| `http.ts` | HTTP routes if any |
| `hash.ts` | Hash-chained audit digest helpers |
| `auth.config.ts`, `auth.ts`, `auth/emailOtp.ts` | Convex Auth, email one-time code |

Deployment: `https://accurate-bird-410.convex.cloud`.

## 4. How to write backend code here

```ts
// A query — reactive, read-only, no auth needed for public reference data.
export const listStations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stations").collect();
  },
});

// A mutation — always validated, always audited when it is operational.
export const recordSighting = mutation({
  args: { stationId: v.id("stations"), species: v.string(), count: v.number(), location: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to record a sighting.");
    if (args.count < 1 || args.count > 5000) throw new Error("Count out of range.");
    // ... write, then append to the hash chain
  },
});

// An action — the ONLY place process.env is allowed.
export const brief = action({
  args: { stationId: v.id("stations"), focus: v.string() },
  handler: async (ctx, args) => {
    const key = process.env.GROQ_API_KEY;
    const findings = deterministicFindings(await readContext(ctx, args.stationId));
    if (!key) return { ...findings, engine: "rule" };
    const written = await callGroq(key, findings);
    return { ...findings, ...written, engine: "model" };
  },
});
```

- `"use node"` is only required on files that use `process.env` or Node built-ins.
  Put those in their own module rather than dragging Node into a query module.
- Both AI surfaces must return the **same shape** whether the model answered or the
  rule engine did. The UI renders one thing.
- Never call the model from a query. Queries are reactive; a model call in a query
  would re-run on every subscription update.
- Anything operational writes an audit-chain entry. The chain detects edit, insertion
  and reordering, so do not "helpfully" rewrite history.

## 5. Regenerating types

```bash
bun convex dev --once
```

- Never run bare `bun convex dev` — this environment is non-interactive and it hangs.
- Never hand-edit `src/convex/_generated/*`. If the types are wrong, run the codegen
  and fix the reported source error.
- After codegen, run `bunx tsc -b --noEmit`.

## 6. The secret scanner

`scripts/scan-secrets.mjs`, run with `bun run scan:secrets`.

It scans `src`, `index.html`, `vite.config.ts`, `convex.json` and `README.md`, skipping
`node_modules`, `dist`, `.git`, `_generated` and `public`, over
`.ts .tsx .js .jsx .mjs .json .html .md`.

**Ten credential-shape patterns**: Groq/OpenAI style (`gsk_`, `sk-`), Anthropic
(`sk-ant-`), Google API key (`AIza…`), AWS access key id (`AKIA`/`ASIA`), GitHub token
(`ghp_`/`gho_`/`ghu_`/`ghs_`/`ghr_`), Stripe (`sk_`/`pk_`/`rk_` live/test), Slack
(`xox…`), private key blocks, bearer token literals, and assigned secret literals
(`apiKey: "…"` style).

Patterns match **values, not names**. `const apiKey = process.env.GROQ_API_KEY` is fine.
`const apiKey = "gsk_live_…"` is not.

**Two structural rules** beyond the patterns:

1. Any `VITE_*` variable whose name matches
   `KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|AUTH` is a finding. The allowlist is
   `VITE_CONVEX_URL`, `VITE_VLY_APP_ID`, `VITE_VLY_MONITORING_URL`.
2. Any `process.env` outside `src/convex/` is a finding. The single reviewed exception is
   `src/lib/vly-integrations.ts`, which is platform-generated and reads the platform's
   own `VLY_INTEGRATION_KEY`.

**The allowlist** has exactly one entry: `src/convex/auth/emailOtp.ts` for
"Assigned secret literal" and "Bearer token literal" — the template's shared OTP relay
credential. It is a relay identity for the platform's own email sender, not a project
secret, and grants nothing beyond sending a one-time code. Anything not listed is a
finding. Do not grow the allowlist to make a scan pass.

Expected output: `Secret scan passed`. It exits non-zero on any finding, so it can be
wired into a pre-commit hook or CI later.

## 7. `.gitignore` credential shapes

`.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx` and service-account file names are
all ignored. Do not remove those lines to make a file trackable — if a credential file
must be shared, it must be sanitised first and reviewed.

## 8. Auth posture

- Sign-in is **email one-time code**. There is no password hash to steal. Do not add
  passwords.
- Anonymous guest sessions are supported; do not remove them.
- `RequireAuth` is the only gate. Role views (Admin, Commander, Scientist, Station) are a
  UI layer in `src/hooks/use-role-view.ts` and `src/lib/roles.ts` — they are **not** an
  authorisation boundary. Never rely on a hidden button as access control; gate in the
  mutation.

## 9. Pre-commit routine

```bash
bunx tsc -b --noEmit
bun convex dev --once
bun run scan:secrets
grep -rn "TODO\|FIXME" src scripts README.md SECURITY.md   # must return nothing
```
