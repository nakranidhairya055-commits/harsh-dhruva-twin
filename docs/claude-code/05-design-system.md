# 05 — DESIGN SYSTEM, POSTER AND PENGUINS (paste this whole file)

---

## 1. The look

**Polar night.** Not a dark theme — a specific place: a research station at 70° S in
winter, screens glowing teal in the dark, ice outside, a single warm accent for anything
that is on fire or running hot. The interface should feel like instrumentation, not a
consumer app, and it should never look like a generic SaaS gradient.

Explicitly avoid: purple/pink gradients, stock hero images, centred-everything marketing
layout, emoji as iconography, and hard-coded hex colours in components.

## 2. Tokens — `src/index.css`

Tailwind v4, `@theme`-mapped, with `:root` and `.dark` kept identical because dark is the
only mode this product ships.

| Token | Value | Used for |
| --- | --- | --- |
| `--background` | `#060B14` | page |
| `--foreground` | `#E8EEF4` | body text |
| `--card` / `--popover` | `#0A121E` | panels, menus |
| `--primary` | `#00E0C6` | ice teal — primary actions, live, nominal, focus ring |
| `--primary-foreground` | `#060B14` | text on primary |
| `--secondary` | `#111C2B` | secondary fills |
| `--muted` | `#0F1826` | muted fills |
| `--muted-foreground` | `#6B7A8F` | secondary text, axis labels |
| `--accent` | `#101B2A` | hover fills |
| `--destructive` | `#FF3B47` | critical |
| `--border` / `--input` | `#1A2533` | hairlines |
| `--ring` | `#00E0C6` | focus |
| `--chart-1..5` | `#00E0C6` `#FFB020` `#4A9EFF` `#FF3B47` `#3EE07F` | chart series |
| `--sidebar*` | `#080E18` base | app shell rail |

`--radius: 0.5rem`.

**Never delete** `@tailwind base; @tailwind components; @tailwind utilities;`, the token
blocks, the `.dark` block, or the base body styles. Never remove `import "./index.css"`
from `src/main.tsx`. Either breaks the entire preview.

## 3. Status colour semantics — `src/lib/station.ts`

Never invent a new status colour. Use the helpers.

| Status | Colour |
| --- | --- |
| critical | `#FF3B47` |
| warning | `#FFB020` |
| watch | `#4A9EFF` |
| nominal | `#3EE07F` |

`statusClasses(status)` returns `{ text, bg, border, dot }`.
`severityClasses(severity)` returns `{ text, bg, border }`.
`formatUtc`, `formatTimeShort`, `formatAge` are the only time formatters.

Subsystem labels come from `SUBSYSTEM_LABELS`: power, thermal, life_support,
environment, comms, safety.

## 4. Typography and rhythm

- One sans family (the Tailwind default stack). Weight and colour carry hierarchy, not
  size alone.
- Body text 14–16 px, panel titles 13–14 px uppercase with tracking, data readouts in a
  tabular/monospace treatment so numbers do not jitter as they tick.
- Data density is a feature: a ten second telemetry tick should visibly change numbers
  without the layout moving.
- Generous vertical rhythm between sections; tight rhythm inside a panel.

## 5. Motion

- Framer Motion for entrances, panel transitions, layout.
- 150–250 ms for hover and toggle, up to ~400 ms for a panel or a route transition.
- The one exception is a 3D camera preset flight, which is deliberately ~1 s.
- Motion must be purposeful: something entering, leaving, or moving because state changed.
  No decorative looping animation on the landing page except the slow penguin bob, which is
  out of phase per penguin so it never looks synchronised.

## 6. The landing page is a poster

`src/pages/Landing.tsx` (601 lines) + `src/components/landing/AntarcticPoster.tsx` +
`src/components/landing/PenguinSvg.tsx`.

**Deliberate decision, do not undo it:** the index page has **no PS ID table, no
theme/category block and no project spec table**. The identity table was removed from the
hero and replaced with a quiet coordinates line:

> Maitri · 70°45'52"S 11°44'03"E — Bharati · 69°24'41"S 76°11'15"E — 3,098 km apart

The `PS 26060` hero badge now shows `PROJECT_IDENTITY.category`, and the `PS` line was
removed from the footer. `IdentityTable` still exists but is used **only** in
`src/components/LegalShell.tsx` (~line 119), where a formal identity table is correct.

The hero currently carries: team / category / SIH badges, the `BrandWordmark` (two-tone
DhruvaTwin with an ice-to-orange gradient), the coordinates line, and two CTAs —
`/dashboard` and `/auth?returnTo=%2Fadvisor`. Below: a capability grid, a penguin band, an
identity strip (**2 stations, 16 command screens, 22 species, 46 expeditions, 12 vehicle
classes**) and a footer with the legal links.

If you add a section to the landing page, it must earn its space. The test is: does it
tell a judge something they cannot see in the first ten seconds?

## 7. The poster illustration — `AntarcticPoster.tsx` (361 lines)

A hand-built **SVG**, not a bitmap. That is a deliberate choice: sharp at any size, loads
instantly, and cannot go missing from a deploy.

It carries the whole idea in one frame: the satellite downlinking on a gradient beam, the
station on its stilts with warm windows and the national flag, the operator's console with
a station overview, a twin cutaway, a telemetry trace and system-health ring gauges, all
under the aurora. Three penguins stand on the ice inside the poster itself.

Exports: `AntarcticPoster`, `BrandWordmark`, `IdentityTable` (legal pages only).

If you extend the poster, keep it a pure function of props with no external image
dependency, and keep the viewBox so it scales.

## 8. Penguin mascots — `PenguinSvg.tsx` (327 lines)

Exports: `PenguinSvg` (with a `chick` variant), `PenguinWaddle`, `Markings`.

- **Cute on purpose**: plump bodies, oversized heads, wide-set eyes with a glint, rosy
  cheeks. The same proportions the 3D wildlife uses, so the mascot and the model are
  recognisably the same animal.
- **Markings stay correct** — Adelie eye ring, emperor neck patch, chinstrap strap, gentoo
  bonnet. Cute, but still identifiable to a field guide.
- Gradient shading plus a rim light and a contact shadow, so they sit on the ice rather
  than float.
- `PenguinWaddle({ kinds, penguinClassName, bob, chicks })` renders a group out of phase.
- `ChickSvg` is the downy emperor chick variant.
- Counts on the public side: **4 adults + 2 chicks** in the landing hero band,
  **3 kinds + 1 chick** in the poster, **2 kinds + 1 chick** in the legal footer.

## 9. Legal pages share one shell

`src/components/LegalShell.tsx` (236 lines) carries the poster band, the wordmark, the
programme chips and the identity table, with penguins tucked into the band, a sticky table
of contents, a cross-link to the other document, and full contact and escalation details.
`Terms.tsx` (186 lines) and `Privacy.tsx` (175 lines) both render inside it. Never restyle
one of them independently.

## 10. Components

- Use `src/components/ui/*` (shadcn/ui). Do not hand-roll a dialog, sheet, popover,
  select, table or toast.
- Use `src/components/panels.tsx` for console panel primitives.
- `src/components/AppShell.tsx` (620 lines) is the signed-in chrome: nav, role switcher,
  sync dropdown, footer legal links.
- Buttons: `variant` + `size` only. If you need something that is not there, extend the
  variant, do not inline a `<button className="…">` that duplicates it.
- Every interactive element needs a visible hover state, a visible focus ring (use
  `ring-ring`), and a real disabled state with a reason.
