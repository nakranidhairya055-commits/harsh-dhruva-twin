# 01 — PROJECT CONTEXT (paste this whole file)

You are working on **DhruvaTwin**. Read all of this before you touch a file. It
describes the product, the identity, and what is already built. Do not re-invent any
of it; extend it.

---

## 1. Identity — copy these strings exactly

- Product name: **DhruvaTwin** (this exact spelling, always, including the `index.html` title)
- Team: **HackFinity007** (this exact spelling, everywhere — README, Terms, `index.html`, `Auth.tsx`, `AntarcticMode.tsx`, `wildlife-data.ts`, `PROJECT_IDENTITY.team`)
- PS ID: **26060**, Theme: **Smart Automation**, Category: **Software**
- Event: **Smart India Hackathon 2026**
- Agency: **NCPOR — National Centre for Polar and Ocean Research, MoES**

All of that lives in one place: `src/lib/station.ts` → `PROJECT_IDENTITY`. Read from
it. Never inline a second copy of the team name or PS ID.

## 2. The two stations — never get these facts wrong

| Station | Established | Location | Coordinates | Code |
| --- | --- | --- | --- | --- |
| **Maitri** | 1989 | Schirmacher Oasis, Central Dronning Maud Land | 70°45'52"S 11°44'03"E | MTQ |
| **Bharati** | 2012 | Larsemann Hills, North Grovnes Island | 69°24'41"S 76°11'15"E | BRT |

**3,098 km apart.** Dakshin Gangotri (buried) and the planned Maitri-II replacement
are also represented in the network picture.

Geography rules that must hold everywhere:

- **Maitri is ~100 km inland.** It gets oasis fauna only: snow petrels, skuas, Antarctic
  petrels, terns, cape petrels, Wilson's storm petrels, and lake invertebrates
  (copepods, rotifers, tardigrades) in Lake Priyadarshini. **No whales, no seals on
  floes, no marine colonies at Maitri.**
- **Bharati is coastal.** It gets the marine fauna: three penguin colonies with chicks,
  seals on the floes, a leopard seal at the waterline, whales and dolphins at the ice
  edge, a krill swarm, fish, sea spiders, six seabird groups including two nesting ledges.

## 3. What the product is

An offline-first Digital Twin command centre for the two stations. It runs a ten
second telemetry simulation, raises incidents, maintains a hash-chained audit log,
and renders two fully modelled 3D station twins with walkable interiors, wildlife,
water systems, vehicle fleet, seven engineering view modes, drone tours, a 2.5D
cutaway, and a long list of operational screens.

**All 40 mandated hackathon checklist items are implemented.** Do not treat anything
on that list as optional; if you add a screen, keep the count at 20 command screens.

## 4. Feature inventory — this is what already works

### 4.1 Two separate 3D twins (not one scene with a flag)

- **Maitri** — pillar-mounted steel main station, Lake Priyadarshini with floating
  floes, heated pipeline with pulsing cyan flow, fuel farm, lake pump house, four
  62.5 kVA diesel gensets, weather mast with anemometer, summer camp, Schirmacher rock
  formations, garage, helipad, cargo yard, balloon shed, incinerator, wind-carved sastrugi.
- **Bharati** — 134-container main building, three CHP units, 13-tank fuel farm with day
  tanks, seawater pump house with the 450 m intake, wastewater plant, laboratory module,
  summer camp, Thala Fjord, Quilty Bay, scattered Larsemann lakes, the 104 m outcrop,
  ice runway, jetty, neighbour markers for Progress (8 km) and Zhongshan.

Both carry displaced terrain (800 m and 900 m aprons), an aurora band, star fields (800
and 1,200 points), snow particle systems (5,000 and 6,000 particles) and fog.

### 4.2 Walkable interiors

The interior world is **mounted instead of** the exterior scene, so walkable detail is
never paid for from outside.

- **Maitri** — 9 rooms on the entrance deck, 9 on the upper deck. Entrance vestibule with
  parka rail and airlock gauges; command centre with six twin-monitor consoles and the
  Antarctic wall map; communication room with modem rack; server room with spinning rack
  fans and an emergency shut-off; generator room with two fully modelled diesel sets
  (engine block, six injector lines, exhaust manifold, cooling fan, analogue gauges);
  water treatment with RO plant and UV steriliser; medical bay with beds, X-ray and
  ultrasound; storage with shelving, pallet racking, folding ladder; living quarters with
  named cabins, dormitories, galley, dining mess, recreation, gym, bathrooms, laundry,
  stairway.
- **Bharati** — 11 rooms per deck. Atrium with skylight and glass-railed stair; command
  centre with a sixteen-monitor video wall; communication centre; data centre with six
  operating racks; power room with three CHP units behind a viewing panel; water
  treatment; wastewater with a bubbling MBBR digester; medical bay; laboratory with four
  benches, fume hood and microscope; storage; workshop with centre lathe and welding
  station; living quarters with twelve cabin doors, dormitory, galley with walk-in pantry,
  dining mess, recreation, gym, bathrooms, laundry, sauna with tiered cedar bench and
  Finnish stove, observation lounge.

Every wall, doorway and partition is generated from **one floor plan**, so a gap in a
wall exists only where a door was declared. Doors swing open as you approach and close
behind you. Every room has a light switch. Every instrumented object opens a detail panel
with live telemetry.

### 4.3 Interactive water

- **Lake Priyadarshini** — surface temperature, ice thickness at shore and centre, purity,
  pH, depth, volume, flow to station, trace heating state, days to complete freeze, plus a
  twelve month ice-coverage chart.
- **Thala Fjord** — surface temperature, salinity, ice coverage, iceberg count, mean and
  max depth, wave height, current speed, aurora reflection.
- **Quilty Bay** — temperature, ice coverage, intake status and flow, post-desalination
  purity, shore assets.
- **Seawater intake** — intake depth and temperature, flow, filter state, pipe integrity,
  trace heating current and resistance.
- **44 Larsemann lakelets** — diameter, depth, ice thickness, water temperature, biota,
  distance from Bharati, last sampling date, with an overlay ranking them by ice thickness
  and flagging active research sites.

The surface is displaced by three superposed swell components in a custom shader, so wave
height and speed come from the station data: 5 cm ripple on the lake, 0.8 m whitecapped
swell on the fjord. Every body has an **underwater view** (seabed relief, boulders, fish,
rising bubbles, submerged intake line); the fjord and bay carry an **iceberg tracker**
with 24 h drift history and a dashed forecast path.

### 4.4 Vehicle fleet — 12 classes

PistenBully tracked snow vehicles, snowmobiles, ATV quad bikes, tracked cargo carriers, a
helicopter with animated rotor, Nansen sledges, cargo sledges, snow blowers, forklifts, a
mobile crane, the Zodiac boat, utility trailers. Tracks roll, the PistenBully blade
breathes through its hydraulic stroke, exhaust particulates rise while an engine runs,
every unit carries a tail number plate in its status colour. Clicking a unit opens its
maintenance record: status, fuel, engine hours, days since service, hours to next
service, track or blade life, capacity, range, location, driver, weather window, with
start-engine, maintenance-log and assign-task actions.

### 4.5 Occupants

36 crew figures walk fixed routes derived from the floor plan (corridor → room centre →
back) so movement is repeatable and never crosses a partition except at a room's own
doorway. Colour-coded by role, animated legs and arms, profile on hover and click.

### 4.6 Wildlife — 22 species

Adelie, emperor, chinstrap and gentoo penguins; Weddell, crabeater and leopard seals;
humpback, minke and killer whales; hourglass dolphins; Antarctic icefish, toothfish, krill,
sea spiders and oasis lake invertebrates; snow petrels, south polar skuas, Antarctic
petrels, Antarctic terns, cape petrels, Wilson's storm petrels.

- Clicking a group opens a species card: Latin name, length, mass, diet, status, four
  field facts, how many animals are modelled in that scene, and a **live sighting log**
  read from the `sightings` table. Recording a sighting writes count, location and
  observer to the station record and appends an audit-chain entry. The card carries a
  chip per colony in the scene.
- **Cute by design**: plump bodies, oversized heads, wide-set eyes with a glint, rosy
  cheeks; they blink, hop, waddle and look around, with fluffy grey chicks following the
  adults. Species markings stay correct (Adelie eye ring, emperor neck patch, chinstrap
  strap, gentoo bonnet) so they remain identifiable.
- **Dev Khandhediya, expedition member** — the expedition systems and digital twin
  administrator. Outdoors he stands with the Adelie colony on the Bharati shore
  (`[24,0,58]`) or with the flyers at Maitri (`[-28,0,46]`) and waves at intervals.
  Indoors he is **seated at his own admin desk in the command room of both stations**
  (`rooms-ops.tsx`, label "Dev Khandhediya - twin admin desk") with the sensor ingest,
  MQTT bridge and offline outbox on the screen. Clicking either opens the same profile
  card, which carries **Go to his desk inside** and **Stand with him outside**.

### 4.7 Seven engineering view modes

Applied through scene-graph material overrides so they work everywhere:
**Exterior** (photographic), **X-Ray** (15% opacity + cyan structural frame),
**Infrared** (purple→red heat map), **Thermal** (higher contrast + live values pinned
per subsystem), **MEP/HVAC** (water cyan, electrical yellow, HVAC orange, fuel red),
**Structural** (load-bearing only), **Night** (emissive only).

### 4.8 Camera, drone tour, survey, plot

- **Free camera by default.** A preset flies once (~1 s) then releases completely. Nothing
  writes to the camera while the operator works. Manual input cancels an in-flight
  preset; any preset can be re-flown from the Camera menu including **Reset to
  overview**. Drag orbits, right-drag pans, scroll zooms.
- **Drone tour** — scripted flight with ten or eleven narrated stops: the site, the
  station structure, power, water, fuel, weather, field support, wildlife and the
  expedition member, water features, interiors. Panel carries briefing, facts, dwell
  progress, pause, previous, next, restart, and half/normal/double speed. Taking control
  hands the camera straight back to free view.
- **Survey layer** — 20 m graticule with bold 100 m lines, 25/50/100/200 m range rings
  with labels, contour rings, north rose. Switchable.
- **Detailed station plot** — mini-map drawn to scale with range rings, north arrow, 50 m
  scale bar, labelled water bodies, every plotted structure. Clicking a block opens its
  hotspot and flies the viewpoint; clicking a lake opens its water panel.
- **Decluttered viewport** — view modes, camera presets and layer switches live in three
  compact menus; legend and context line share one block; labels, survey and hotspot
  markers each toggle independently.

### 4.9 Labels — click to show, cross to remove

Nothing floats over the site on its own. Click an object — a station, the generator hall,
the CHP plant, the fuel farm, the seawater intake, the heated pipeline, any fixture inside
a room — and its label appears where you clicked, carrying the live readings, with a
cross at the top right that removes that one label. Clicking the same object again
toggles it off. `Esc` clears everything. A `clear N labels` chip in the scene toolbar
does the same in one click, so the pinned count is always visible.

Ambient titles — the green telemetry strip, the amber airlock marker, the neighbouring
station nameplate, room name plates — sit behind a **Place titles and telemetry strips**
switch that starts **off**. While walking, nothing floats until that switch is on. `L`
or the `labels on/off` chip strips every floating label and puts it back; the Layers menu
carries a **Remove N clicked labels** entry; the interior has a `Hide labels` button.

Species labels have their own switch: the field card carries **Name labels over the
ice**, mirrored in the Layers menu as **Species name labels**.

### 4.10 Walk the site on foot

**Walk the site** button as well as orbit. Click the canvas for pointer lock, WASD to
walk, Shift to sprint, Space to jump, mouse to look. The hull, fuel farm and summer camp
block you out; the fjord and the oasis lake fence you off so nobody walks on water; a
boundary keeps the walk on the map; the amber airlock marker still drops you inside.
Distance walked counts toward the field badge.

### 4.11 Navigation, time, 2.5D

- Orbit outside, walk inside: WASD, mouse look with pointer lock, Shift sprint, Space
  jump, `Esc` releases the pointer.
- Mini-map in the corner: the station plot outside, the current deck plan inside, always
  with the live player marker and heading.
- Teleport menu (`T`) covering both deck landings, all forty interior rooms, every water
  body, every vehicle unit, and the camera presets.
- Time of day slider and season selector driving real solar geometry per latitude:
  midnight sun through summer, polar night through winter, aurora opacity following the
  season, apron floodlights at night, and a **24 hour timelapse** that runs a day in
  about ten seconds.
- **2.5D isometric cutaway** — the footprint as flat isometric tiles, every room of both
  decks extruded as a cutaway block (floor and four walls, no ceiling) built from the same
  floor plans as the walkable interior. Live temperature, power draw, occupancy and status
  float above every room, colour coded by subsystem health; selecting a block drives the
  same hotspot selection the 3D view uses.

### 4.12 AI blackout predictor (continuity engine)

Nav status widget `Drop predicted in X min — Y% confidence`. Surfaces in the 3D viewport
overlay, the right rail card and the footer. Telemetry charts carry a dotted orange
forecast line. **Simulate Satellite Blackout** starts a 60 s uplink loss: VSAT drops, the
twin shows a red pulsing border, a critical incident is raised. After the window closes a
**reconciliation panel** compares predicted against measured uplink retention and records
the delta against the 95% target. Model combines live VSAT SNR, surface wind (the katabatic
driver), uplink latency creep and a slow orbital geometry term.

### 4.13 Antarctic Mode

A separate interface, not a theme. Pure black background, pure white text, 4 px white
borders, bright yellow active elements, red criticals, green successes. Body text ≥18 pt,
numerals 28 pt, every control ≥64×64 px, SOS control 200×200 with a red pulsing glow.
Trigger: top nav toggle, `Ctrl+Shift+A`, or automatic activation at −20 °C or ≥80 km/h
wind. Screens: Home (four large squares plus SOS), Tasks, Report Issue, Check-In, Vehicle
Log, Weather, full-screen SOS with GPS. Field traffic is written to the priority queue
before any network attempt.

### 4.14 MQTT and offline sync

Broker `broker.hivemq.com` over `wss://broker.hivemq.com:8884/mqtt`. Topics:
`dhruvatwin/telemetry/{stationId}/{sensorId}`, `.../telemetry/{stationId}/batch`,
`dhruvatwin/alerts/{stationId}`, `dhruvatwin/sos/{stationId}`, `dhruvatwin/queue/{stationId}`.
IndexedDB outbox with priority classes **SOS 1, Critical 2, Check-in 3, Routine 4**,
replayed highest-first when the link returns. A sync indicator in the top bar reports
broker state, online/offline and the pending count.

### 4.15 Cascade drill (flowchart)

Each station has its own real dependency graph. Maitri: fuel farm → four 62.5 kVA
generators → PDU → critical bus → thermal plant → heated lake pipeline → habitat envelope
→ VSAT → AWS → detection. Bharati: 13 fuel tanks → three CHP units → distribution grid →
emergency bus → thermal loop → 450 m seawater intake → desalination → wastewater plants →
container envelope → laboratory → detection.

Nodes carry redundancy (none, N+1, dual), a consequence weight and a real isolation time.
Redundancy attenuates propagation; isolation stops it.

- **A flowchart, not a scatter.** Each dependency tier is a swimlane so it reads left to
  right in the order consequence travels: utilities, prime movers, distribution, critical
  loads, crew loads. Every edge has an arrowhead pointing downstream, amber while
  carrying consequence and cyan where an isolation stopped it, and each affected box is
  numbered in propagation order.
- **Drive it from the diagram.** Click any box to shut that system down and the whole
  chart recomputes: state colours, highlighted flow path, numbered order, response window,
  resilience index. The dropdown and the diagram are two ways into the same drill, and
  the summary line states plainly what is affected — how many systems, how many isolated
  by the plan, which node is crew-critical and when.
- Outputs: nodes reached, response window in minutes, crew-risk node, resilience index,
  and a recommendation naming the node to protect first.
- Every drill is stored with the full propagation and appended to the audit chain; a drill
  at warning or above raises the crew-risk node as a real incident in triage.

### 4.16 Repair bay and FPGA self-healing

**Telemetry repair.** The fault queue is derived from live channels: out of band, dropped
(no sample inside the window), drifting toward a warn limit, or flagged by signal quality.
Each fault carries the field procedure written out step by step. Applying a repair closes
the matching incidents, writes a corrected sample back inside the operating band so the
plant really does report nominal again, records the work in the repair log and appends to
the hash-chained audit log.

**FPGA self-healing.** A real simulation, not a progress bar: it builds a 256 frame
bitstream held in triple modular redundancy, injects single-event upsets into individual
copies, runs the bitwise majority voter, runs the scrubber, and re-verifies every frame
against its own CRC signature. **PASS** only when no single-bit upset reaches the logic
and no corruption slips past the CRC. Two upsets in one copy are physically unrepairable
by voting and are reported as detected-uncorrectable rather than hidden. Reported: trials,
corrected by vote, corrected by scrub, frames rewritten, double-bit events repaired,
detected-uncorrectable, undetected, mean and worst scrub time, plus the per-trial table.
A **scrub interval planner** computes the upsets expected between passes, the double-bit
risk and the recommended maximum scrub interval, then passes or fails the configured
interval against it. Verdicts can be recorded to the station record and the audit chain.

### 4.17 Live supply-ship tracker

Built the honest way for a station with no AIS feed: the vessel's own route, service speed
and contingency are the model, and every number on the screen is computed from that one
clock, so nothing can disagree with anything else.

- Three modelled voyages: Cape Town → Bharati relief, Cape Town → Maitri relief, and the
  inter-station Bharati → Maitri leg, from real route geometry with waypoints, notes and
  discharge plans.
- **Live clock.** The board refreshes on a five second tick, the header carries a pulsing
  **LIVE** badge with seconds since the last update, and the ship marker pulses with it.
- **Track that shows where the ship is.** Passage already run in bright cyan, passage still
  to run as a dim dashed line, ship on the seam between them. Distance run, remaining,
  countdown and noon reports all come off that seam.
- Live position, course and compass, distance run and remaining in nm and km, day of
  voyage, schedule margin, ice state against the plotted ice edge, planned arrival, live
  countdown, passage progress.
- **Map that follows the ship.** The satellite embed stays anchored on the vessel and
  re-anchors every ninety seconds, so the position moves without the frame reloading on
  every tick. Centring on Cape Town, the destination or a waypoint takes the map off
  follow; **Follow the ship** puts it back.
- **Scrub the passage.** The timeline slider moves the single clock the whole page is built
  from, with departure, mid-passage, arrival and jump-to-now presets.
- Noon reports with position, distance run, average speed, wind, swell and air temperature,
  with the ice-edge crossing marked. Cargo manifest and vessel particulars.
- **Google Maps** satellite embed, **Google Earth** deep link, route links to the station.
  The embed is **keyless** — no Maps credential of any kind, nothing on the client needs a
  key. A built-in route chart drawn by the twin from the same geometry, with ice edge,
  graticule, waypoints, port and destination all plotted and clickable.

### 4.18 Field badge

Progression layer over everything you do in the twin, in local storage so it survives a
reload and works offline. **Nineteen badges in four tracks** — Explorer (walk 100 m and
500 m outside, stand in ten and twenty-five rooms, visit both stations, use teleport, step
inside), Naturalist (open five species cards, record a sighting, stand with Dev outside,
find him at his admin desk), Operator (watch three drone tour stops, open the 2.5D
cutaway, open the resupply tracker, flush the offline queue), Resilience (run a cascade
drill, apply a repair, run the FPGA self-test, generate an advisor briefing). Experience,
levels and a progress bar in the Field badge card in the right rail; locked badges still
state what they ask for, so the list doubles as a to-do list. Winning a badge raises a
toast with its XP. A reset button clears progress for a clean demo.

### 4.19 AI

**Station assistant** (dock, `Ctrl`/`Cmd + K`) — Groq `llama-3.3-70b-versatile` with live
station context injected on every request: telemetry channels, open incidents, continuity
prediction, microgrid state, local weather. It is given the **console map** (every screen,
its path, what it holds) and instructed to answer guidance questions with the exact screen
name, the path and the two or three steps that matter, then name the next thing to open.
A "Guide me through the console from the start" prompt returns an ordered eight-step
walkthrough. Routing questions like "where do I change the isolation plan" or "what should
I do next" are answered **locally in the same tick** by `src/lib/assistant-fast.ts` with no
round trip, so the guide never makes the operator wait. General questions (polar science,
engineering, history, definitions, writing help) are answered properly from the model's own
knowledge; mixed questions get both parts. A server answer types itself out at reading
speed, the wait shows staged status text, every answer is stamped with its model and
elapsed time, and the last answer can be copied or the last question retried in one click.
Without a key a deterministic rule engine answers over the same live context, backed by a
built-in polar reference set (Antarctic Treaty, katabatic wind, TMR and single-event
upsets, polar water systems, NPDC metadata, generator maintenance, sea ice, station history).

**AI station advisor** (`/advisor`) — the assistant answers what you ask; the advisor
decides what you should be told. It reads live telemetry, the open incident list for that
station, the continuity prediction, the generation snapshot, local weather, recent channel
repairs, FPGA self-test verdicts and the station's own dependency graph. Nothing in a
briefing comes from outside that context and the **evidence panel** lists the exact facts
each conclusion rests on. Output is ranked, not prose: a headline, a risk level, then three
to six actions each with the reading or dependency behind it, who owns it and the window it
fits in, plus a watch list and the evidence list. Six focus areas: daily briefing, power and
heat, the water path, connectivity, the sea lift, field safety. Changing focus regenerates
the briefing for that subject, and arrival on the screen produces one automatically.
Real analysis, not a prompt: the worst three out-of-band channels become the first actions;
generation under 15% headroom raises a reserve action; a continuity drop inside two hours
raises the fallback-profile and outbox actions; the dependency graph is searched for the
widest single-point shutdown and the drill slot is pointed at it; the repair log is scanned
for the channel that keeps coming back; the sea lift line is computed from the same voyage
model the tracker draws. Follow-up questions go to the same assistant with the same live
context. With `GROQ_API_KEY` the briefing is written by `llama-3.3-70b-versatile` in JSON
mode against a live context block and validated before it reaches the screen, with the
deterministic findings kept as the evidence list; without a key the same shape is produced
by the rule engine. **Both engines must produce the same shape.**

### 4.20 NPDC metadata and roles

Metadata auto-tagged with CF-1.11 standard names and GCMD keywords, validated against
National Polar Data Centre submission standard `NPDC-DS-01`, exported as schema.org
Dataset JSON-LD. Every export is written to the audit chain. Four role views — **Admin**,
**Commander**, **Scientist**, **Station** — filter navigation, gate actions such as
continuity drills and dataset publication, and change what the console emphasises.

### 4.21 Weather extension

Open-Meteo (no API key): hourly temperature, wind, surface pressure and humidity for both
station coordinates — 24 h temperature trend in cyan, 24 h wind trace in amber, 7 day
pressure trace in violet, 7 day forecast strip. If the public endpoint is unreachable the
page falls back to the station automatic weather station series.

### 4.22 Legal and public pages

`/terms` and `/privacy` are public, polished, and linked from the landing footer, every
signed-in footer, and the consent line on the sign-in page. See document 07.

## 5. Numbers quoted on the public index page

If you touch `src/pages/Landing.tsx`, these identity-strip figures are the ones on
screen: **2 stations, 16 command screens, 22 species, 46 expeditions, 12 vehicle
classes.** The index page deliberately shows **no** PS ID table, no theme/category
clutter and no project spec table — the coordinates line replaced the identity table in
the hero. `IdentityTable` survives only inside `src/components/LegalShell.tsx` for the
legal pages, where the formality is appropriate.

Penguins on the public side: 4 adults + 2 chicks in the landing hero band, 3 kinds +
1 chick inside the poster illustration, 2 kinds + 1 chick in the legal footer.

## 6. What NOT to do

- Do not add a second backend, a REST server, or a second state store.
- Do not add a password field. Sign-in is email one-time code.
- Do not duplicate server state into React state. Convex queries are reactive.
- Do not start a background process, a dev server, or a long-running shell command.
- Do not introduce a browser-side API key, "just for the map".
- Do not add a placeholder, an empty state with no explanation, or a disabled button with
  no reason.
