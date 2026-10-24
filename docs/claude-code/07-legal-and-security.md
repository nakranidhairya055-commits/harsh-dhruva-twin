# 07 — LEGAL AND SECURITY (paste this whole file)

---

# Part A — the legal pages

## A1. Structure

Three files, one shell, two documents.

| File | Lines | Contains |
| --- | --- | --- |
| `src/components/LegalShell.tsx` | 236 | Poster band, `BrandWordmark`, programme chips, `IdentityTable` (~line 119), penguins tucked into the band, sticky table of contents, cross-link to the other document, full contact and escalation details |
| `src/pages/Terms.tsx` | 186 | The terms of use |
| `src/pages/Privacy.tsx` | 175 | The privacy notice |

Both are **public** routes — `/terms` and `/privacy` — reachable from the landing footer,
from every signed-in footer (`AppShell`), and from the consent line on `/auth`.

Both are dated **28 September 2026**. Keep the two dates identical when you edit either.

Never restyle one page independently. If the shell needs a change, change the shell.

## A2. What `/terms` must cover

Acceptance and eligibility; accounts and access; acceptable use; an explicit
**assumption-of-risk** section stating that the platform must not be used for navigation,
clearance, life-safety or any other professional decision and that simulated data, modelled
voyages and AI output carry no operational guarantee; ownership of and responsibility for
user content; the AI features and their limits; simulated and third-party data;
intellectual property and no-endorsement; availability and offline losses; security and
responsible disclosure; termination with survival; a **disclaimer and limitation of
liability** including an aggregate cap for a free non-commercial prototype; **indemnity**;
governing law with an informal resolution step before the Indian courts; and general
provisions.

## A3. What `/privacy` must cover

The controller; what is collected and **explicitly what is not**; how it is used; legal
basis and consent including withdrawal; who it is shared with; an **AI processing** section
describing exactly what leaves the deployment when the assistant or advisor is used; cookies
and local storage; concrete retention rules; security and breach notification;
international transfers; the rights of a data principal under the **Digital Personal Data
Protection Act 2023** including nomination and escalation to the Data Protection Board;
children; and a grievance contact with a thirty day response commitment.

## A4. Rules for editing

- This is an Indian project for a government research agency. The law named is the
  **DPDP Act 2023**. Do not substitute GDPR as the primary regime.
- Never narrow a data-subject right. If a section is tightened, keep every right listed in
  A3 present.
- Never claim a security property the product does not have. The privacy notice must
  match the code in Part B of this document.
- Keep the legal pages visually identical in quality to the product. A judge will read
  them.
- Team name is **HackFinity007** in `Terms.tsx`. Keep it.

---

# Part B — the security model

`SECURITY.md` at the repository root carries the full document. This is the working
summary and the rules that follow from it.

## B1. Threat model in one paragraph

The assets that matter are (1) the model provider key, (2) operator identity, (3) the
integrity of the audit chain, and (4) the honesty of the display — a judge must never be
able to mistake simulated data for a real reading. The realistic attacker is a curious
user with devtools open, or a mistake that puts a key in a component. Everything below
exists to make that attacker fail and that mistake loud.

## B2. The five controls

1. **No credential reaches the browser.** Provider keys are read from `process.env`
   inside Convex `"use node"` actions. Nothing under `src/` reads a key. The only
   `VITE_*` values are the Convex deployment URL and the platform's public app and
   monitoring identifiers.
2. **Fail-safe AI.** With no key configured, the assistant and the advisor answer from a
   deterministic rule engine over the same live data, and both report which engine
   answered. A missing credential is visible, not silent.
3. **Guard rail.** `bun run scan:secrets` scans for credential-shaped literals and two
   structural rules, and exits non-zero on a finding. `.gitignore` blocks every credential
   file shape (`.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, service-account
   names).
4. **Codes, not passwords.** Sign-in is email one-time code, so there is no password hash
   to steal. Protected routes sit behind `RequireAuth`, mutations validate their arguments
   with Convex validators, and operational actions append to a hash-chained audit log that
   detects editing, insertion and reordering.
5. **Honest data.** Every reading is labelled as simulated where it is simulated. The
   terms page says so. The AI output is marked with its engine and model.

## B3. Leak paths, and what closes each

| Path | Status |
| --- | --- |
| A key pasted into a React component | Closed by the scanner's assigned-secret-literal pattern and the `VITE_*` structural rule |
| A key in a `VITE_` variable | Closed by structural rule 1 — any `VITE_*` name matching `KEY\|SECRET\|TOKEN\|PASSWORD\|PASSWD\|CREDENTIAL\|AUTH` is a finding |
| A key read in a component with `process.env` | Closed by structural rule 2 — `process.env` outside `src/convex/` is a finding |
| A `.env` file committed | Closed by `.gitignore` and by never editing `.env` at all |
| A key in the repository history | Never happens — keys are set in the platform Keys UI and live in deployment env |
| A browser-side Maps key | Does not exist. The `/resupply` embed is keyless. If one is ever added it must be a public, referrer-restricted key |
| Keyless Open-Meteo and HiveMQ | Intentionally keyless and public; nothing to leak |
| A model call that leaks station data | The privacy notice states exactly what leaves the deployment; the assistant sends station context and the user's question, nothing else |

The single reviewed exception to the structural rules is `src/lib/vly-integrations.ts`,
which is platform-generated and reads the platform's own `VLY_INTEGRATION_KEY`. The single
reviewed exception to the value patterns is `src/convex/auth/emailOtp.ts`, the template's
shared OTP relay credential — a relay identity, not a project secret. Do not grow either
list.

## B4. AI-specific rules

- Both AI surfaces must degrade to the rule engine, produce the same response shape, and
  say which engine answered.
- The assistant is instructed never to invent sensor values. Station context is supplied,
  not forced into unrelated answers.
- The advisor may only conclude from the evidence list it builds from live context, and the
  evidence panel must show on screen.
- Never log a key, a full key prefix, or an authorisation header to the console.
- The assistant is not an authority. The terms page says so, and the UI must not imply
  otherwise.

## B5. Auth-specific rules

- No passwords, ever. No password field, no hash, no reset flow that implies one.
- Anonymous guest sessions stay.
- `RequireAuth` is the route gate. Role views are a **UI layer only** — never rely on a
  hidden control for authorisation; gate in the mutation.
- Every mutation that changes operational state validates its arguments and writes an
  audit-chain entry.

## B6. Dependency rules

- Do not add a dependency for something already in the project. Check first.
- Do not add a second React, Tailwind, shadcn/ui, three.js or Convex.
- Prefer an existing library over a hand-rolled version of something standard.
- A new dependency that pulls in a client-side auth or analytics SDK needs a justification
  in the PR description, because those are the two categories that can exfiltrate data.

## B7. Reporting

`SECURITY.md` names the reporting channel and sets a response expectation. Keep it
accurate: if the contact changes, the file changes in the same commit.

## B8. Before you say a change is safe

```bash
bun run scan:secrets
bunx tsc -b --noEmit
bun convex dev --once
grep -rn "TODO\|FIXME" src scripts README.md SECURITY.md   # expect nothing
```

Then answer, out loud, in your summary:

1. Could this change put a secret in the client bundle? Why not?
2. Does this change work with no model key configured? Why?
3. Does this change work offline, or does it degrade visibly? Which?
4. Did I touch an allowlist in the scanner? If yes, why is that entry legitimately safe?
