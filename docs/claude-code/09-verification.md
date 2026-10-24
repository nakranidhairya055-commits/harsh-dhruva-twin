# 09 — VERIFICATION (paste this whole file)

Run this before you tell anyone a change is done. All four must be true.

---

## 1. The three commands

```bash
bunx tsc -b --noEmit        # must exit 0
bun convex dev --once       # must print "Convex functions ready!" and exit 0
bun run scan:secrets       # must print "Secret scan passed" and exit 0
```

Then:

```bash
grep -rn "TODO\|FIXME" src scripts README.md SECURITY.md docs   # must return nothing
```

### Never

- `bun run dev`, `vite`, `node server.js` — the platform owns the dev server. Never
  start, stop, restart or kill it, and never kill a process on a port. A stale preview is
  a code error; fix the code.
- `bun convex dev` without `--once` — this is a non-interactive terminal and it hangs.
- `bun run build` — a full production build. Only on explicit request.
- Anything containing `&`, `nohup`, or a background launch — the command hangs until the
  timeout kills it and the process dies with it.
- Editing `.env` or reading env files from the terminal.

## 2. The newline-corruption bug

`write_file` has, on this project, persisted **literal `\n` escape sequences** instead of
newlines for a large file. It collapsed `src/components/twin/scene-labels.ts` onto a
single line and produced roughly 200 TypeScript errors.

**Check every file you write or rewrite, immediately:**

```bash
wc -l <file>          # is the line count plausible?
head -4 <file>        # are the first lines separate?
grep -c '\\n' <file>  # 0, unless the file legitimately discusses "\n"
```

A one-line file with thousands of bytes, or a `grep -c` count that is large and not
explained, means the file is flattened. Repair it:

```bash
node -e "const fs=require('fs');const p='<file>';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\\\\n/g,'\n'))"
```

Then re-run the check and the typecheck.

## 3. Stale-edit problem

`str_replace` has failed with "old string not found" on `src/pages/Twin.tsx` for text
that verifiably exists — a sync staleness issue, not a matching failure.

Workarounds, in order:

1. Re-read the file window and copy the exact current text.
2. Anchor on a **smaller unique substring** instead of a whole block.
3. Use `allowMultiple: true` for several independent replacements in one call.
4. If the file is large, edit a smaller region in several passes.

Never conclude a change is applied because the tool said so. Re-read and confirm.

## 4. Manual acceptance checks

The typecheck will not catch any of these. Do them by hand after a change in the area.

### If you touched the twin

- Click an object → a label appears with live readings and a cross.
- Click the cross → that label goes, nothing else does.
- Click the label body → it dismisses too.
- Click the same object again → it toggles off.
- `Esc` → everything clears; the `clear N labels` chip count matches reality.
- Ambient titles are still **off** by default.
- Walk mode shows no floating labels until the titles switch is on.
- Species names respond to **Name labels over the ice**.
- Orbit, walk, teleport (`T`), drone tour, and all seven view modes still work.

### If you touched auth or routing

- Signed out → protected route → lands on `/auth?returnTo=<path>`.
- Sign in → lands on that path, not on `/`.
- `/auth` with no `returnTo` → lands on `/dashboard`.
- Every nav entry resolves to a real page. No dead links.
- `*` renders `NotFound`.

### If you touched an AI surface

- With a key: the model answers, and the answer is stamped with the model and elapsed time.
- Without a key: the rule engine answers, and the answer says so.
- **Both paths return the same response shape** — the UI renders one thing.
- The advisor's evidence panel lists real facts from live context.

### If you touched the landing page or legal pages

- The index page still shows **no** PS ID / theme / category / spec table.
- The coordinates line is intact.
- Penguins render and bob out of phase.
- `/terms` and `/privacy` still share `LegalShell`, still cross-link, and still show the
  same 28 September 2026 date.

### If you touched a Convex module

- `bun convex dev --once` regenerated types (no hand-edited `_generated`).
- Mutations validate arguments — try calling one with a bad argument and confirm it throws.
- Operational actions appended to the audit chain, and the chain still verifies on
  `/audit`.

## 5. What to report back

State plainly:

1. The files you changed and why.
2. The exact output of the three commands, not "tests pass".
3. What you checked by hand.
4. Anything you could not verify, and why.
5. If you touched the scanner allowlist, which entry and why it is legitimately safe.

Never claim a check passed that you did not run.

## 6. Known open issue

The key in the **Keys UI** is named `Groq`. The code reads `process.env.GROQ_API_KEY`
(`src/convex/assistant.ts`, `src/convex/advisor.ts`). They do not match, so the model
path is not currently taken and both AI surfaces are answering from the rule engine.

Fix: rename the key in the UI to `GROQ_API_KEY` (preferred), or read
`process.env.GROQ_API_KEY ?? process.env.Groq` in both actions.

This is a **naming** mismatch, not a leak. The value has never been in a file, and the
scanner confirms it.
