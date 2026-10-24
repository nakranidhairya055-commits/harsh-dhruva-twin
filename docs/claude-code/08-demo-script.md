# 08 — DEMO SCRIPT (paste this whole file)

The judge walkthrough, in order. Twenty-two steps, roughly twelve minutes at a normal
pace. Every step names what to click and **what the judge should conclude**.

Read this before rehearsing. If a step does not land in one sentence, that is a bug, not a
script problem.

---

## Before you start

- Open the app signed out. Land on the public poster.
- Have the browser at 1440×900 or wider.
- Do **not** mention the problem statement ID on stage. The landing page deliberately does
  not show it. Answer it verbally if asked.
- If `GROQ_API_KEY` is correctly set, the AI steps will be noticeably better. If it is
  not, **say so out loud**: "This is the deterministic engine, because I have not
  configured a key in this environment. Here is what the same screen does with one." The
  product states which engine answered — that is a feature, not a fallback to apologise
  for.

## The run-through

### 1 — Land (10 s)
Poster hero, wordmark, the two station coordinates and 3,098 km, penguins, CTAs.
**Conclusion:** this is a real product, not a form.

### 2 — Sign in (20 s)
Click through to `/auth`, sign in with the email one-time code. Note there is no password.
**Conclusion:** the access model is deliberate.

### 3 — Sensor Dashboard (45 s)
Let the ten second tick land. Open the featured chart.
**Conclusion:** this is live, not a screenshot.

### 4 — Alert Triage (45 s)
Incident matrix. Acknowledge a critical. Resolve a warning.
**Conclusion:** alerts are worked, not just displayed.

### 5 — Station Dashboard (30 s)
Roster, badge state, duty board. Queue a roll call.
**Conclusion:** people are modelled, not implied.

### 6 — Microgrid and CHP (30 s)
Load against supply, thermal recovery, plant advisories.
**Conclusion:** the energy chain is understood at the physics level.

### 7 — Digital Twin 3D (2 min — the centrepiece)
Switch station. Cycle the seven view modes. Open the 2.5D cutaway.

Then the label demonstration, which is the thing to nail:

- **Click the generator hall.** The label appears with the live readings and a cross.
- **Click the cross.** That one label goes; nothing else moves.
- **Click a second object.** Two labels up.
- **Press `Esc`.** Clean scene again.
- Point at the **`clear N labels`** chip to show the pinned count is always visible.
- Open **Layers** and show **Place titles and telemetry strips** is **off** by default, and
  **Species name labels** as a separate switch.

**Conclusion:** the viewport is clean until you ask for information, and everything you
ask for can be taken back off.

### 8 — Wildlife and Dev Khandhediya (60 s)
Click the Adelie colony. Species card: Latin name, length, mass, diet, four field facts,
how many are modelled, live sighting log. Record a sighting — show the audit entry.

Then press **Go to his desk inside**. You land in the command room facing Dev at his admin
desk, with the sensor ingest, MQTT bridge and offline outbox on the screen. Click the desk
to open the same card indoors. Then **Stand with him outside** to put him back among the
penguins.

**Conclusion:** the expedition member exists on both sides of the wall, and the geography
is honest — marine fauna at coastal Bharati, oasis fauna at inland Maitri.

### 9 — Walk the site and the field badge (60 s)
Back outside, **Walk the site**, click the canvas, walk the apron. Then open the Field
badge card in the right rail: level, XP bar, and the badge you just won.
**Conclusion:** it is a place you can move through, and it remembers you.

### 10 — Drone tour and free camera (45 s)
Drone Tour, let it narrate two or three stops. Then take the camera, switch to Exterior,
and drag. Nothing fights you.
**Conclusion:** guided when you want it, free when you need it.

### 11 — Continuity drill (60 s)
**Simulate Satellite Blackout.** VSAT drops, the twin gets a red pulsing border, a critical
incident is raised. After 60 s, read the reconciliation: predicted versus measured
retention against the 95% target.
**Conclusion:** the system is honest about its own prediction error.

### 12 — Antarctic Mode (45 s)
Toggle from the top bar or `Ctrl+Shift+A`. Send a check-in, then the SOS.
**Conclusion:** there is a different interface for a different physical situation.

### 13 — Offline sync (30 s)
The sync badge shows the outbox draining to `broker.hivemq.com`. Mention the priority
classes: SOS 1, Critical 2, Check-in 3, Routine 4.
**Conclusion:** the link can die and nothing important is lost.

### 14 — Weather Extension (20 s)
Open-Meteo graphs and the 7 day forecast strip.
**Conclusion:** real external data, no key required.

### 15 — Cascade Drill (90 s — the second centrepiece)
Trigger the generator hall at critical. Run it. Watch the swimlane flowchart light up
downstream, edges amber, boxes numbered in propagation order.

Then **tick the isolation points in the plan** and watch the response window and the
resilience index move. Click a box on the diagram directly to shut it down and watch the
whole chart recompute.

**Conclusion:** the operator's plan changes the outcome, and the plan can be driven from
the diagram.

### 16 — Repair Bay and FPGA (90 s)
Open a fault, read the procedure, apply it. Show the incident closing and the channel
returning to band. Then run the FPGA self-test: trials, corrected by vote, corrected by
scrub, detected-uncorrectable, mean and worst scrub time, and the scrub interval verdict.
**Conclusion:** maintenance is a simulation with real numbers, not a progress bar.

### 17 — Resupply Voyage (90 s)
Ship mid-passage. Cyan track behind, dim dashed line ahead, ship on the seam. Noon
reports. Route chart. Google Maps and Google Earth links. Scrub the timeline.
**Conclusion:** one clock drives every number, so nothing can disagree, and there is no
map key to leak.

### 18 — Station assistant (60 s)
`Ctrl`/`Cmd + K`. It opens with "Guide me through the console from the start" — take the
eight-step walkthrough. Then ask a routing question ("where do I change the isolation
plan") and note it answers instantly with no round trip. Then ask a general polar-science
question to show it answers those too.
**Conclusion:** it is a guide to the product first and a language model second.

### 19 — AI Advisor (90 s)
Open `/advisor`. A briefing is already there on arrival. Read the headline, the risk
level, the ranked actions with owners and windows. Switch the focus to the water path,
then to the sea lift.
**Conclusion:** the same live data produces a different briefing per question, and the
evidence panel shows what it is based on.

### 20 — NPDC and Audit (45 s)
Run the compliance gates, export the metadata package, then open the Audit Trail and show
the export entry in the verified chain.
**Conclusion:** the platform is ready to hand data to a national data centre, and the
chain shows it.

### 21 — Role views (30 s)
Switch between Admin, Commander, Scientist, Station.
**Conclusion:** the console adapts to who is using it.

### 22 — The landing page and the legal pages (45 s)
Go back to `/` as signed out. Show the poster, the coordinates, the penguins, and the
absence of a spec table. Then `/terms` and `/privacy`.
**Conclusion:** the public surface is finished too, not just the demo path.

---

## Rehearsal notes

- The three steps that must not be rushed: **7** (labels), **15** (cascade isolation),
  **19** (advisor evidence). They are the three places a judge can tell a mock from a model.
- If the AI is on the rule engine, say so and show the advisor's evidence panel — the
  deterministic findings are the evidence list, and that is a good answer, not a dodge.
- Never invent a number on stage. If a screen does not show it, the honest answer is
  "it does not measure that".
- Have the terminal open in a second window for `bun run scan:secrets` if a judge asks
  about the key. Run it live. It prints `Secret scan passed`.
