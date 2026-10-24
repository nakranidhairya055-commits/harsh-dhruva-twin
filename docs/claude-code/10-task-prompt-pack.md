# 10 — TASK PROMPT PACK (paste one of these)

Each block below is a complete, self-contained prompt. Paste one into Claude Code, follow
it with whatever document the task needs, and stop. They are written to be pasted cold.

---

## T1 — Fix the Groq key name mismatch

```
In this DhruvaTwin repo the AI surfaces read process.env.GROQ_API_KEY in
src/convex/assistant.ts and src/convex/advisor.ts, but the key in the platform Keys UI is
named "Groq", so the model path is never taken and both surfaces fall back to the rule
engine.

Make the code resilient: in both files, read the key as
process.env.GROQ_API_KEY ?? process.env.Groq, with a short comment explaining that the
Keys UI entry is named Groq. Do not change anything else about the two actions, do not
move the value into any VITE_ variable, and do not write the key itself anywhere.

Then run: bun convex dev --once, bunx tsc -b --noEmit, bun run scan:secrets.
Report the exact output of all three. Do not start or restart any dev server.
```

## T2 — Add a new command screen

```
Add a new command screen to DhruvaTwin at /<name>. Before you write any component, read
docs/claude-code/01-project-context.md, docs/claude-code/02-architecture-and-conventions.md
and docs/claude-code/06-features-and-routes.md.

Requirements:
- src/pages/<Name>.tsx, lazy imported in src/main.tsx, wrapped in RequireAuth with a
  real title and description that say what the screen holds.
- A nav entry in src/components/AppShell.tsx in the same change.
- Read live data from Convex. Do not duplicate server state into React state; the queries
  are reactive.
- Use the existing shadcn/ui components and src/components/panels.tsx. No new
  dependencies.
- Colour only from the tokens in src/index.css and the status helpers in
  src/lib/station.ts. No hard-coded hex outside art.
- The screen must work with no model key configured, and must work offline or degrade
  visibly with a stated reason.
- No TODO, no FIXME, no placeholder text, no disabled control without a reason, no empty
  state without an explanation.
- If it performs an operational action, validate the mutation arguments and append to the
  hash-chained audit log.

Then run bunx tsc -b --noEmit, bun convex dev --once and bun run scan:secrets, and report
the exact output of all three.
```

## T3 — Add or change a 3D label

```
I need a click-to-show, removable label on <object> in the DhruvaTwin 3D twin.

Read docs/claude-code/04-twin-label-system.md first and follow it exactly. The non-negotiables:
- Nothing floats over the scene unless the operator asked for it.
- The label appears only when the object is clicked, and clicking the same object again
  toggles it off.
- The label carries a cross at its top right that dismisses just that label, and clicking
  the label body dismisses it too.
- Dismissing is final: the label must not reappear on hover or selection, only on a fresh
  click.
- Wire it into the existing store in src/components/twin/scene-labels.ts. Do not create a
  second list of pinned labels.
- If it is ambient, gate it on display.titles (and display.deckPlan indoors). Ambient
  titles must stay off by default.
- If it is a species name, also respect the "Name labels over the ice" switch.
- If it is a hotspot, add it through Hotspot in src/components/twin/twin-primitives.tsx
  rather than duplicating hotspot behaviour.
- If it is hover-revealed, use useHoverHold() so the pointer can reach the cross.

After the change, verify by hand: click on, cross, click body, second click, Esc, and the
clear N labels count. Then run bunx tsc -b --noEmit and report the output.
```

## T4 — Make a Convex change safely

```
I need a Convex change in DhruvaTwin: <describe it>.

Read docs/claude-code/03-convex-and-secrets.md first.

Rules:
- Validate every mutation argument with v.* validators and throw a specific error.
- Check auth where the action is not public.
- Append to the hash-chained audit log for any operational change. Do not rewrite history.
- If the change needs a provider key, read it with process.env inside a "use node" file.
  Nothing under src/ outside src/convex/ may read process.env, and no VITE_ variable whose
  name contains KEY, SECRET, TOKEN, PASSWORD, PASSWD, CREDENTIAL or AUTH may be introduced.
- If it is an AI surface, it must work with no key configured, return the same shape
  either way, and state which engine answered.
- Do not call a model from a query. Queries are reactive; a model call would re-run on
  every subscription update.

Regenerate types with bun convex dev --once (never bare `convex dev`, never hand-edit
src/convex/_generated). Then run bunx tsc -b --noEmit and bun run scan:secrets, and report
the exact output.
```

## T5 — Make a visual change on the landing page

```
I want to change the public landing page of DhruvaTwin: <describe the change>.

Read docs/claude-code/05-design-system.md first.

Constraints:
- The index page is a poster. It deliberately shows NO problem statement ID table, no
  theme or category block and no project spec table. Do not add one back. The identity
  table belongs only in src/components/LegalShell.tsx.
- The hero keeps its coordinates line, its two CTAs (/dashboard and
  /auth?returnTo=%2Fadvisor) and the identity strip: 2 stations, 16 command screens,
  22 species, 46 expeditions, 12 vehicle classes.
- The poster illustration is hand-built SVG in AntarcticPoster.tsx, not a bitmap. Do not
  introduce an external image.
- Penguins are cute on purpose but their species markings stay correct.
- Colour comes from the tokens in src/index.css only.
- No purple/pink gradient, no stock imagery, no centred-everything layout, no emoji as
  icons.
- Any new section must tell a judge something they cannot see in the first ten seconds.

Then run bunx tsc -b --noEmit and report the output.
```

## T6 — Edit a legal document

```
I want to update <terms|privacy> in DhruvaTwin: <describe the change>.

Read docs/claude-code/07-legal-and-security.md first.

Rules:
- Both pages render inside src/components/LegalShell.tsx. Never restyle one independently.
- Keep both documents dated 28 September 2026.
- The privacy notice is Indian law: the Digital Personal Data Protection Act 2023 is the
  primary regime, not GDPR. Do not remove any data-subject right: access, correction,
  erasure, grievance redress, nomination, and escalation to the Data Protection Board.
- Keep the AI processing section accurate about exactly what leaves the deployment.
- Never claim a security property the code does not have. Cross-check against Part B of
  document 07 and SECURITY.md.
- Keep the team name exactly HackFinity007.
- Keep the page visually equal in quality to the rest of the product.

Then run bunx tsc -b --noEmit and report the output.
```

## T7 — Improve 3D performance

```
The DhruvaTwin 3D twin is heavy. Find and fix real performance problems: <describe the
symptom, e.g. "panning outside stutters", "entering an interior takes 3 seconds">.

Read docs/claude-code/02-architecture-and-conventions.md §7 and
docs/claude-code/06-features-and-routes.md first.

Rules:
- Measure before you change. Identify whether the cost is geometry creation, material
  compilation, draw calls, particle count, or React re-renders.
- Do not raise or lower the particle and star counts (5,000 / 6,000 snow, 800 / 1,200
  stars) without a measured reason.
- Keep the interior world mounting INSTEAD OF the exterior rather than inside it.
- Keep TwinDisplayState defaults: labels true, titles false.
- Do not add a dependency. Do not add React.memo everywhere as a substitute for fixing
  the actual cause.
- Do not change anything a user can see unless it is the bug they reported.

Then run bunx tsc -b --noEmit, and describe what you measured and what you changed.
```

## T8 — Rehearse the demo

```
Help me rehearse the DhruvaTwin demo. Read docs/claude-code/08-demo-script.md and
docs/claude-code/01-project-context.md.

Then:
1. Tell me the three steps I must not rush, and why those three.
2. Give me the exact two sentences for explaining the AI surfaces if GROQ_API_KEY is not
   configured, phrased so that the deterministic engine sounds like a feature rather than
   an apology.
3. Tell me the five questions a judge is most likely to ask that the demo does not answer
   on its own, and draft a direct, honest answer to each from what the code actually does.
4. Tell me what to do if the network, the model, or the Convex backend fails mid-demo.

Do not modify any files.
```

## T9 — Pre-merge review

```
Review my current changes to DhruvaTwin as if you were the person who has to ship them.

Read CLAUDE.md, docs/claude-code/02-architecture-and-conventions.md and
docs/claude-code/09-verification.md first, then inspect the working tree.

Check, in this order, and report findings as a list with file and line:
1. Any secret, key, or process.env read outside src/convex/.
2. Any VITE_ variable that could carry a credential.
3. Any TODO, FIXME, placeholder, stub, or dead button.
4. Any hook rule violation: conditional hooks, hooks in loops or callbacks, shadowed
   hook names, a second React import.
5. Any Convex mutation without argument validation or without an audit-chain entry.
6. Any route that is not lazy loaded, not wrapped in RequireAuth, or not reachable from
   the nav.
7. Any place the AI surfaces could return different shapes for the model path and the rule
   engine path.
8. Any place a number is hard-coded that should come from a live source — especially
   anything on /resupply, which must have exactly one clock.
9. Anything that would leave a blank preview: a missing import of src/index.css, a
   removed Tailwind directive, a removed provider or error boundary in src/main.tsx.

Then run bunx tsc -b --noEmit, bun convex dev --once and bun run scan:secrets and report
the exact output. Do not fix anything yet. Just report.
```

## T10 — Continue from a flat file

```
src/components/twin/scene-labels.ts appears to have been flattened: it is on one line
with literal \n escape sequences, and the typecheck is reporting roughly 200 errors in
that file.

Repair it by replacing every literal backslash-n sequence with a real newline, then
confirm the file is about 191 lines and that the first four lines are separate. Re-run
bunx tsc -b --noEmit and report the output. Do not change any of the logic, and do not
touch any other file.
```
