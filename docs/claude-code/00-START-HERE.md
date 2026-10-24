# 00 — START HERE (paste this first)

> **Purpose of this folder.** Eleven self-contained documents that hand any coding
> agent the complete state of DhruvaTwin. Paste one whole file at a time into Claude
> Code. Each file is written to stand alone — you do not need the others in context
> to act on it, but the order below is the order that works.

## The set

| # | File | Paste it when you want the agent to… |
| --- | --- | --- |
| 00 | `00-START-HERE.md` | understand the map of this folder (this file) |
| 01 | `01-project-context.md` | know what DhruvaTwin is, its identity, stations, and current feature set |
| 02 | `02-architecture-and-conventions.md` | follow the code conventions, file layout, naming, and React/Tailwind rules |
| 03 | `03-convex-and-secrets.md` | work on the backend without ever leaking a key |
| 04 | `04-twin-label-system.md` | change the 3D label, cross, hover-hold, or pin behaviour |
| 05 | `05-design-system.md` | match the polar-night look, the poster, or the penguin mascots |
| 06 | `06-features-and-routes.md` | change or extend any of the command screens |
| 07 | `07-legal-and-security.md` | edit `/terms`, `/privacy`, or `SECURITY.md` |
| 08 | `08-demo-script.md` | run or rehearse the judge walkthrough |
| 09 | `09-verification.md` | verify a change is actually safe to ship |
| 10 | `10-task-prompt-pack.md` | grab a ready-made prompt for a specific change |

## How to use it

1. **Cold start.** Paste `01`, then `02`. You now know the project and the rules.
2. **Before a backend change.** Paste `03`.
3. **Before a twin/scene change.** Paste `04`.
4. **Before any visual change.** Paste `05`.
5. **Before adding or editing a screen.** Paste `06`.
6. **Before you finish, always.** Paste `09` and run the three commands yourself.

`CLAUDE.md` at the repository root carries the same rules in a shorter form and is
picked up automatically by Claude Code — you do not have to paste it.

## One open issue, flagged deliberately

The **Keys UI** currently holds a key literally named `Groq`. The code reads
`process.env.GROQ_API_KEY` (`src/convex/assistant.ts`, `src/convex/advisor.ts`).
Those do not match, so the model path is silently falling through to the rule engine.

Fix it one of two ways — pick one and do it, do not leave it:

- **Preferred:** rename the key in the Keys UI to `GROQ_API_KEY`. No code change.
- **Acceptable:** make the two actions read `process.env.GROQ_API_KEY ?? process.env.Groq`.

Never put the key itself in a file, a comment, a prompt, or a commit.
