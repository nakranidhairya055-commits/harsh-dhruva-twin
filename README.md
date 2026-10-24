# DhruvaTwin

Offline-first Digital Twin platform for the Indian Antarctic research stations at Maitri and Bharati.

- Team: **HackFinity007**
- Problem Statement ID: **26060**
- Theme: **Smart Automation**
- Category: **Software**
- Event: **Smart India Hackathon 2026**
- Agency: **NCPOR - National Centre for Polar and Ocean Research, Ministry of Earth Sciences**

Built to monitor two Indian Antarctic research stations:

| Station | Established | Location | Coordinates |
| --- | --- | --- | --- |
| Maitri | 1989 | Schirmacher Oasis, Central Dronning Maud Land | 70°45'52"S 11°44'03"E |
| Bharati | 2012 | Larsemann Hills, North Grovnes Island | 69°24'41"S 76°11'15"E |

The two stations are 3,098 km apart. Dakshin Gangotri (buried) and the planned Maitri-II replacement are also represented in the network picture.

## Working on this project

`CLAUDE.md` at the repository root holds the short-form agent rules and is picked up
automatically by Claude Code. A longer, pasteable prompt set lives in
`docs/claude-code/` — start at `docs/claude-code/00-START-HERE.md`. It covers project
context, conventions, the Convex and secrets rules, the 3D label system, the design
system, every route, the legal and security documents, the judge demo script, the
verification routine, and a pack of ready-made task prompts.

## What the platform does

### Separate 3D twins

Two distinct scenes, not one scene with a parameter switch.

- **Maitri** - pillar-mounted steel main station, Lake Priyadarshini with floating ice floes, the heated pipeline with pulsing cyan flow, fuel farm, lake pump house, four 62.5 kVA diesel generators, weather mast with anemometer, summer camp, Schirmacher rock formations, garage, helipad, cargo yard, balloon shed, incinerator and wind-carved sastrugi.
- **Bharati** - the 134-container main building, three CHP units, the 13-tank fuel farm with day tanks, seawater pump house with the 450 m intake, wastewater plant, laboratory module, summer camp, Thala Fjord, Quilty Bay, scattered Larsemann lakes, the 104 m outcrop, ice runway, jetty and neighbour markers for Progress (8 km) and Zhongshan.

Both scenes carry displaced terrain (800 m and 900 m aprons), an aurora band, star fields (800 and 1,200 points), snow particle systems (5,000 and 6,000 particles) and fog, plus clickable hotspots on every major object and a telemetry readout strip above the station.

### Walkable interiors

The interior is its own world, mounted instead of the exterior scene rather than inside it, so every room can be modelled at walkable detail without paying for it from outside.

- **Maitri** - 9 rooms on the entrance deck and 9 on the upper deck: entrance vestibule with the parka rail and airlock gauges, command centre with six twin-monitor consoles and the Antarctic wall map, communication room with modem rack and radio console, server room with spinning rack fans and an emergency shut-off, generator room with two fully modelled diesel sets (engine block, six injector lines, exhaust manifold, cooling fan, analogue gauges), water treatment with the reverse osmosis plant and UV steriliser, medical bay with beds, X-ray unit and ultrasound, storage with shelving, pallet racking and a folding ladder, plus living quarters with named cabins, dormitories, galley, dining mess, recreation room, gymnasium, bathrooms, laundry and stairway.
- **Bharati** - 11 rooms on each deck: atrium with skylight and glass-railed stair, command centre with a sixteen-monitor video wall, communication centre, data centre with six operating racks, power room with three CHP units behind the viewing panel, water treatment, wastewater treatment with a bubbling MBBR digester, medical bay, laboratory with four benches, fume hood and microscope, storage, workshop with centre lathe and welding station, plus living quarters with twelve cabin doors, dormitory, galley with walk-in pantry, dining mess, recreation, gymnasium, bathrooms, laundry, sauna with tiered cedar bench and Finnish stove, and the observation lounge.

Every wall, doorway and load-bearing partition is generated from one floor plan, so a gap in a wall exists only where a door was declared. Doors swing open as you approach and close behind you. Every room has a clickable light switch, and every significant object inside a room opens its own detail panel with live telemetry where the object is instrumented.

### Interactive water

Every water body carries the measurements the station acts on and can be clicked for its survey panel.

- **Lake Priyadarshini** - surface temperature, ice thickness at shore and centre, purity, pH, depth, volume, flow to station, trace heating state and days to complete freeze, with a twelve month ice coverage chart.
- **Thala Fjord** - surface temperature, salinity, ice coverage, iceberg count, mean and maximum depth, wave height, current speed and aurora reflection.
- **Quilty Bay** - temperature, ice coverage, intake status and flow, post-desalination purity and shore assets.
- **Seawater intake** - intake depth and temperature, flow, filter state, pipe integrity and the trace heating current and resistance.
- **44 Larsemann lakelets** - diameter, depth, ice thickness, water temperature, biota, distance from Bharati and last sampling date, with an overlay that ranks them by ice thickness and flags active research sites.

The surface is displaced by three superposed swell components in a custom shader, so wave height and speed come straight from the station data: a 5 cm ripple on the lake, 0.8 m whitecapped swell on the fjord. Every body has an **underwater view** showing seabed relief, boulders, fish, rising bubbles and the submerged intake line, and the fjord and bay carry an **iceberg tracker** with twenty-four hours of drift history and a dashed forecast path.

### Vehicle fleet

Twelve vehicle classes are modelled and laid out per station: PistenBully tracked snow vehicles, snowmobiles, ATV quad bikes, tracked cargo carriers, a helicopter with animated rotor, Nansen sledges, cargo sledges, snow blowers, forklifts, a mobile crane, the Zodiac boat and utility trailers. Tracks roll on the running machines, the PistenBully blade breathes through its hydraulic stroke, exhaust particulates rise while an engine runs, and every unit carries a tail number plate in its status colour. Clicking a unit opens its maintenance record: status, fuel, engine hours, days since service, hours to next service, track or blade life, capacity, range, location, driver and weather window, with start-engine, maintenance-log and assign-task actions.

### Occupants

Thirty-six crew figures walk fixed routes derived from the floor plan - corridor to room centre and back - so movement is repeatable and never crosses a partition except at a room's own doorway. Figures are colour coded by role, animate their legs and arms while walking, and report a profile on hover and click.

### Wildlife and the expedition member

Both twins carry a living wildlife layer, switchable from the Layers menu and clickable in the scene.

- **Twenty-two species**, each with a real field-guide entry: Adelie, emperor, chinstrap and gentoo penguins; Weddell, crabeater and leopard seals; humpback, minke and killer whales; hourglass dolphins; Antarctic icefish, toothfish, krill, sea spiders and oasis lake invertebrates; snow petrels, south polar skuas, Antarctic petrels, Antarctic terns, cape petrels and Wilson's storm petrels.
- **Placed honestly.** Bharati sits on the coast, so it carries the marine fauna: three penguin colonies with chicks, seals on the floes, a leopard seal cruising the waterline, whales and dolphins at the ice edge, a krill swarm, fish, seafloor sea spiders and six seabird groups including two nesting ledges. Maitri is 100 km inland, so it gets what genuinely lives on the oasis: flyers riding the ridge line, terns flying in to bathe at the lake margin, storm petrels in the rock crevices and copepods, rotifers and tardigrades in Lake Priyadarshini. Each species card states where it is seen and carries a link to the station where it is modelled.
- **Interactive models.** Click any group for its species card: Latin name, length, mass, diet, status, four field facts, how many animals are modelled in that scene and a live sighting log read from the `sightings` table. Recording a sighting writes the count, the location and the observer to the station record and appends an audit-chain entry, and the card carries a chip per colony in the scene so switching species is one click.
- **Cute by design.** The penguins are deliberately pushed towards the appealing end of the proportions - plump bodies, oversized heads, wide-set eyes with a glint, rosy cheeks - and they blink, hop, waddle and look around, with fluffy grey chicks following the adults. The species markings stay correct (Adelie eye ring, emperor neck patch, chinstrap strap, gentoo bonnet), so the models remain identifiable.
- **Dev Khandhediya, expedition member.** The expedition systems and digital twin administrator is modelled in both places. Outdoors he stands with the Adelie colony on the Bharati shore, or with the flyers at Maitri, and waves at intervals; indoors he is seated at his own admin desk in the command room of both stations, with the sensor ingest, MQTT bridge and offline outbox on the screen. Clicking either one opens the same profile card, and the card carries **Go to his desk inside** and **Stand with him outside**: the desk jump lands you in the command room facing him.

### Seven engineering view modes

Applied to both twins through scene-graph material overrides so every mode works everywhere.

1. **Exterior** - photographic rendering
2. **X-Ray** - buildings at 15 percent opacity with the structural frame drawn in cyan
3. **Infrared** - purple to red heat-map overlay across the station envelope
4. **Thermal** - higher contrast heat map with live temperature values pinned to each subsystem
5. **MEP / HVAC** - water cyan, electrical yellow, HVAC orange, fuel red service runs
6. **Structural** - load-bearing structure only
7. **Night** - emissive elements only, for a polar night inspection walk

### Free camera, drone tour and map detail

- **Free camera by default.** A camera preset flies the camera once, over about a second, and then releases it completely. Nothing writes to the camera while the operator works, so a drag, pan or zoom stays exactly where it is left. Manual input cancels an in-flight preset, and any preset can be re-flown from the Camera menu (including **Reset to overview**). Drag orbits, right-drag pans, scroll zooms, closer and further than before.
- **Drone tour mode.** A scripted flight over each station with ten or eleven narrated stops: the site, the station structure, power, water, fuel, weather, field support, wildlife and the expedition member, the water features and interiors. The panel carries the written briefing, the facts behind the stop, dwell progress, pause, previous, next, restart and half, normal or double speed; taking control hands the camera straight back to free view.
- **Survey layer.** A 20 m graticule with bold 100 m lines, 25/50/100/200 m range rings with distance labels, contour rings around each raised sector and a north rose, all switchable. Layer switches for labels, survey and hotspots live in the Layers menu and apply to the live scene without rebuilding it.
- **Detailed station plot.** The mini-map graticule is drawn to scale with range rings, a north arrow, a 50 m scale bar, labelled water bodies and every plotted structure. Clicking a block opens its hotspot and flies the matching viewpoint; clicking a lake opens its water panel.
- **Decluttered viewport.** Seven view modes, the camera presets and the layer switches live in three compact menus instead of open columns, the legend and context line share one block, and labels, survey and hotspot markers can each be turned off independently.
- **Click for the label, cross to take it off.** Nothing floats over the site on its own. Click an object - a station, the generator hall, the CHP plant, the fuel farm, the seawater intake, the heated pipeline, any fixture inside a room - and its label appears where you clicked, carrying the live readings behind it, with a cross drawn at the top right of the label that removes that one label. Clicking the same object again toggles it off. `Esc` clears everything you opened, and a `clear N labels` chip in the scene toolbar does the same in one click, so the count of what is pinned is always visible.
- **Ambient titles are still available, but only on request.** The green telemetry strip, the amber airlock marker, the neighbouring-station nameplate and the room name plates sit behind a **Place titles and telemetry strips** switch that starts off, and while walking nothing floats over anything until that switch is on. `L` or the `labels on/off` chip strips every floating label and puts it back, the Layers menu has a **Remove N clicked labels** entry, and the interior view has a `Hide labels` button.
- **Species labels have their own switch.** The field card carries a **Name labels over the ice** toggle, so penguin, seal and whale names can be taken off the scene while the facts stay in the card; the Layers menu carries the same switch as **Species name labels**.
- **Walk the site on foot.** The exterior has a **Walk the site** button as well as orbit: click the canvas for pointer lock, then WASD to walk the apron, Shift to sprint, Space to jump, mouse to look. The hull, fuel farm and summer camp block you out, the fjord and the oasis lake fence you off so nobody walks on water, a boundary keeps a walk on the map, and the amber airlock marker still drops you inside. Distance walked counts towards the field badge.

### Navigation and time

- **Orbit mode** outside, **walk mode** inside: WASD, mouse look with pointer lock, Shift to sprint, Space to jump, Esc to release the pointer.
- **Mini-map** in the corner, drawing the station plot while outside and the current deck plan while inside, always with the live player marker and heading.
- **Teleport menu** (press `T`) covering both deck landings, all forty interior rooms, every water body, every vehicle unit and the camera presets.
- **Time of day** slider and season selector driving real solar geometry for each station's latitude: the midnight sun through summer, the polar night through winter, aurora opacity following the season, apron floodlights raised at night, and a **24 hour timelapse** that runs the full day in about ten seconds.

### 2.5D isometric cutaway

The station footprint is drawn as flat isometric tiles with every room of both decks extruded as a cutaway block (floor and four walls, no ceiling). The blocks are built from the same floor plans the walkable interior uses, so the cutaway and the first-person decks describe one station rather than two drawings. Live temperature, power draw, occupancy and status float above every room, colour coded by subsystem health, and selecting a block drives the same hotspot selection the 3D view uses.

### AI blackout predictor (continuity engine)

- Status widget in the top nav: `Drop predicted in X min - Y% confidence`
- Prediction surfaces in the 3D viewport overlay, the right rail card and the footer
- Telemetry charts carry a dotted orange forecast line
- **Simulate Satellite Blackout** starts a 60 second uplink loss: VSAT drops, the twin shows a red pulsing border, a critical incident is raised
- After the window closes a **reconciliation panel** compares predicted against measured uplink retention and records the delta against the target 95% accuracy

The model combines live VSAT signal-to-noise ratio, surface wind (the katabatic driver), uplink latency creep and a slow orbital geometry term.

### Antarctic Mode

A separate interface, not a theme. Pure black background, pure white text, 4 pixel white borders, bright yellow active elements, red criticals and green successes. Body text is at least 18 point, numerals 28 point, every control is at least 64 by 64 pixels and the SOS control is 200 by 200 with a red pulsing glow.

- Trigger: top nav toggle, `Ctrl+Shift+A`, or automatic activation at -20 °C or above 80 km/h wind
- Screens: Home (four large squares plus SOS), Tasks, Report Issue, Check-In, Vehicle Log, Weather and a full-screen SOS with GPS
- Field traffic is written to the priority queue before any network attempt

### MQTT and offline sync

- Broker: `broker.hivemq.com` over `wss://broker.hivemq.com:8884/mqtt`
- Topics: `dhruvatwin/telemetry/{stationId}/{sensorId}`, `dhruvatwin/telemetry/{stationId}/batch`, `dhruvatwin/alerts/{stationId}`, `dhruvatwin/sos/{stationId}`, `dhruvatwin/queue/{stationId}`
- IndexedDB outbox with priority classes **SOS 1, Critical 2, Check-in 3, Routine 4**, replayed highest-priority-first when the link returns
- A sync indicator in the top bar reports broker state, online/offline and the pending count

### Cascade drill (failure propagation, drawn as a flowchart)

One equipment trigger propagates through the station's real dependency graph, and the operator's isolation plan changes the outcome rather than the wording around it.

- Each station has its own graph: Maitri runs from the fuel farm through four 62.5 kVA generators, the PDU, the critical bus, the thermal plant, the heated lake pipeline, the habitat envelope, VSAT, the AWS and detection; Bharati runs from 13 fuel tanks through three CHP units, the distribution grid, the emergency bus, the thermal loop, the 450 m seawater intake, the desalination and wastewater plants, the container envelope, the laboratory and detection.
- Nodes carry redundancy (none, N+1, dual), a consequence weight and a real isolation time. Redundancy attenuates propagation; isolation stops it.
- **A flowchart, not a scatter.** Each dependency tier is a swimlane, so the diagram reads left to right in the order consequence actually travels: utilities, prime movers, distribution, critical loads, crew loads. Every edge carries an arrowhead pointing downstream, coloured amber while it is carrying consequence and cyan where an isolation has stopped it, and each affected box is numbered in propagation order.
- **Drive it from the diagram.** Click any box to shut that system down and the whole chart recomputes: the state colours, the highlighted flow path, the numbered order, the response window and the resilience index. The dropdown and the diagram are two ways into the same drill, and the summary line under the chart states plainly what is affected - how many systems, how many isolated by the plan, and which node is crew-critical and when.
- The screen colours every node by state, highlights the propagation path, and lists the timeline with time to impact, probability, path and the isolation procedure for each node.
- Outputs: nodes reached, response window in minutes, crew-risk node, resilience index, and a recommendation naming the node to protect first.
- Every drill is stored with the full propagation and appended to the audit chain, and a drill at warning or above raises the crew-risk node as a real incident in triage.

### Repair bay and FPGA self-healing

**Telemetry repair.** The fault queue is derived from the live channels: out of band, dropped (no sample inside the window), drifting toward a warn limit, or flagged by signal quality. Each fault carries the field procedure written out step by step. Applying a repair closes the matching incidents, writes a corrected sample back inside the operating band so the plant really does report nominal again, records the work in the repair log and appends an entry to the hash-chained audit log.

**FPGA self-healing verification.** A real simulation, not a progress bar: it builds a 256 frame bitstream held in triple modular redundancy, injects single-event upsets into individual copies, runs the bitwise majority voter, runs the scrubber and re-verifies every frame against its own CRC signature.

- Verdicts: **PASS** only when no single-bit upset reaches the logic and no corruption slips past the CRC. Two upsets in one copy are physically unrepairable by voting and are reported as detected-uncorrectable rather than hidden.
- Reported: trials, corrected by vote, corrected by scrub, frames rewritten, double-bit events repaired, detected-uncorrectable, undetected, mean and worst scrub time, plus the per-trial table.
- A **scrub interval planner** computes the upsets expected between passes, the double-bit risk and the recommended maximum scrub interval, then passes or fails the configured interval against it.
- Verdicts can be recorded to the station record and the audit chain.

### Live supply-ship tracker (Google Maps and Google Earth)

The user asked for a live map that tracks the cargo supply ship. The tracker is built the honest way for a station with no AIS feed: the vessel's own route, service speed and contingency are the model, and every number on the screen is computed from that one clock, so nothing can disagree with anything else.

- Three modelled voyages: the Cape Town to Bharati relief, the Cape Town to Maitri relief and the inter-station Bharati to Maitri leg, from real route geometry with waypoints, notes and discharge plans.
- **Live clock.** The board refreshes on a five second tick, the header carries a pulsing **LIVE** badge with the seconds since the last update, and the ship marker on the chart pulses with it, so the screen reads as a live instrument rather than a static report.
- **Track that shows where the ship is.** The chart draws the passage already run in bright cyan and the passage still to run as a dim dashed line, with the ship on the seam between them: the distance run, the remaining distance, the countdown to arrival and the noon reports all come off that same seam.
- **Live position, course and compass**, distance run and remaining in nautical miles and kilometres, day of voyage, schedule margin, ice state against the plotted ice edge, planned arrival, a live countdown to arrival and passage progress, all computed from the route, the speed and the time.
- **Map that follows the ship.** The satellite embed stays anchored on the vessel and re-anchors every ninety seconds, so the position keeps moving without the frame reloading on every tick. Centring on Cape Town, on the destination or on any waypoint takes the map off follow, and **Follow the ship** puts it back.
- **Scrub the passage.** The timeline slider moves the single clock the whole page is built from, with departure, mid-passage, arrival and jump-to-now preset buttons. Scrub it and the position, distance run, sea state, noon reports and countdown all follow together, which is how the discharge window at the station can be checked before the ship is there.
- Noon reports with position, distance run, average speed, wind, swell and air temperature, with the ice-edge crossing marked.
- Cargo manifest and vessel particulars for the modelled charter vessel.
- **Google Maps** satellite embed centred on the ship or any waypoint, **Google Earth** deep link, and route links to the destination station. The embed is keyless, so the tracker works with no configuration and no Maps credential of any kind: nothing on the client needs a key, and the optional Maps JavaScript API upgrade would use a browser key restricted by referrer rather than a secret, read from a `VITE_*` variable that must never hold a server credential.
- A built-in route chart drawn by the twin from the same geometry used for the position, so the ship marker cannot drift away from the numbers. Ice edge, graticule, waypoints, port and destination are all plotted and clickable.

### Field badge (gamification)

The twin keeps a progression layer over everything you do in it, stored in local storage so it survives a reload and works offline.

- **Nineteen badges in four tracks**: Explorer (walk 100 m and 500 m outside, stand in ten and twenty-five rooms, visit both stations, use teleport, step inside), Naturalist (open five species cards, record a sighting, stand with Dev outside, find him at his admin desk), Operator (watch three drone tour stops, open the 2.5D cutaway, open the resupply tracker, flush the offline queue) and Resilience (run a cascade drill, apply a repair, run the FPGA self-test, generate an advisor briefing).
- **Experience, levels and a progress bar** are shown in the Field badge card in the twin's right rail, with the locked badges still stating what they ask for, so the list doubles as a list of things to go and do. Winning a badge raises a toast with its XP.
- A reset button clears progress for a clean demo.

### Terms and privacy

Two public legal documents, `/terms` and `/privacy`, linked from the landing footer, from every signed-in footer and from the consent line on the sign-in page.

- **Terms (`/terms`)** cover what DhruvaTwin is and is not, acceptance and eligibility, accounts and access, acceptable use, an explicit **assumption-of-risk** section stating that the platform must not be used for navigation, clearance, life-safety or any other professional decision and that simulated data, modelled voyages and AI output carry no operational guarantee, ownership of and responsibility for user content, the AI features and their limits, simulated and third-party data, intellectual property and no-endorsement, availability and offline losses, security and responsible disclosure, termination with survival, a **disclaimer and limitation of liability** including an aggregate cap for a free non-commercial prototype, **indemnity**, governing law with an informal resolution step before the Indian courts, and general provisions.
- **Privacy (`/privacy`)** covers the controller, what is collected and explicitly what is not, how it is used, legal basis and consent including withdrawal, who it is shared with, an **AI processing** section describing exactly what leaves the deployment when the assistant or advisor is used, cookies and local storage, concrete retention rules, security and breach notification, international transfers, the rights of a data principal under the Digital Personal Data Protection Act 2023 including nomination and escalation to the Data Protection Board, children, and a grievance contact with a thirty day response commitment.

### Public pages (landing and legal)

- **The landing page is a poster.** The hero presents the project the way it was pitched: the team and programme chips across the top, the two-tone `DhruvaTwin` wordmark with an ice-to-orange gradient, and the identity table - PS ID, theme, category, project and stations - beside one hand-built SVG illustration carrying the whole idea. That illustration is drawn in code rather than shipped as a bitmap, so it stays sharp at any size, loads instantly, and cannot go missing: the satellite downlinking on a gradient beam, the station on its stilts with warm windows and the national flag, the operator's console with a station overview, a twin cutaway, a telemetry trace and system-health ring gauges, all under the aurora.
- **Cute real penguins.** Adelie, emperor, chinstrap and gentoo are drawn as SVG mascots with the proportions the 3D twin uses and the markings that identify each species, then set bobbing out of phase: three of them stand on the ice in the poster itself, four more carry the field-population section with their identification marks, and two keep the legal pages human.
- **The legal pages match the product.** `LegalShell` carries the same poster band, wordmark, programme chips and identity table, with the penguins tucked into the band, a sticky table of contents, a cross-link to the other document, and full contact and escalation details.

### Security

See `SECURITY.md` for the full model and the disclosure policy. The short version:

- **No credential reaches the browser.** Every provider key is read from `process.env` inside a Convex `"use node"` action, so it exists only in the backend process. Nothing under `src/` reads a key, and the only Vite-exposed values are the deployment URL and the platform's public identifiers.
- **Fail-safe AI.** With no key configured the assistant and the advisor answer from a deterministic rule engine over the same live data, and they report which engine answered, so a missing credential is visible rather than silent.
- **Guard rail.** `bun run scan:secrets` scans the source tree for credential-shaped literals (Groq, OpenAI, Anthropic, Google, AWS, GitHub, Stripe and Slack key formats, private key blocks, bearer literals and assigned secret strings) and exits non-zero on a finding. `.gitignore` blocks every credential file shape, including `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx` and service-account file names.
- **Codes not passwords.** Sign-in is by email one-time code, so there is no password hash to steal; protected routes sit behind an auth guard, mutations validate their arguments with Convex validators, and operational actions are written to a hash-chained audit log that detects editing, insertion or reordering.

### Command screens (20)

Sensor Dashboard, Alert Triage and Incident Matrix, Station Dashboard with personnel roster, Microgrid and CHP Command, Local Environment with the ice velocity map, Digital Twin 3D, Antarctica Overview, Weather Extension, Antarctic Mode, AI Advisor, Cascade Drill, Repair Bay, Resupply Voyage, NCPOR Library, NPDC Compliance Centre, Expedition Logs, Audit Trail, Equipment Catalog, Workspace and Admin Console.

### Weather extension

Open-Meteo (no API key) provides hourly temperature, wind, surface pressure and humidity for both station coordinates: a 24 hour temperature trend in cyan, a 24 hour wind trace in amber, a 7 day pressure trace in violet and a 7 day forecast strip. If the public endpoint is unreachable the page falls back to the station automatic weather station series.

### Station assistant

A Groq-powered assistant using `llama-3.3-70b-versatile`, with live station context injected on every request: telemetry channels, open incidents, continuity prediction, microgrid state and local weather.

- **It is the guide for the whole console.** The assistant is given the console map - every screen, its path and what it holds - and it is instructed to answer guidance questions with the exact screen name, the path and the two or three steps that matter, then to name the next thing to open. A "Guide me through the console from the start" prompt on the empty dock returns an ordered eight-step walkthrough, and questions such as "where do I change the isolation plan" or "what should I do next" are routed to the right screen rather than answered vaguely.
- **Guidance is answered instantly.** Screen routing, the guided walkthrough, the click-to-label behaviour, the field badge and how the model key works are all answered locally in the same tick with no round trip, so the guide never makes the operator wait to find out where something is. The same routing exists server side in the deterministic rule engine, so the guide still works with no model key configured.
- **General questions are answered too.** The assistant decides what a question needs: operational questions are grounded in live context and never invent sensor values; general questions (polar science, engineering, history, definitions, writing help) are answered properly from the model's own knowledge; mixed questions get both parts. Station context is supplied, not forced into unrelated answers.
- **Responsiveness.** Greetings, identity, console how-to and topic help are answered locally in the same tick with no round trip. A server answer types itself out at reading speed instead of painting in one block, the wait shows staged status text, and every answer is stamped with its model and elapsed time. Ctrl/Cmd + K opens the dock, Escape closes it, and the last answer can be copied or the last question retried in one click.
- **Offline.** Without a Groq key a deterministic rule engine answers over the same live context, backed by a built-in polar reference set covering the Antarctic Treaty, katabatic wind, TMR and single-event upsets, polar water systems, NPDC metadata, generator maintenance, sea ice and the station history.

### AI station advisor

The assistant answers what you ask. The advisor decides what you should be told, which is a different job and gets its own screen at `/advisor`.

- **Grounded, not guessed.** The advisor action reads live telemetry, the open incident list for that station, the continuity prediction, the generation snapshot, local weather, the recent channel repairs, the FPGA self-test verdicts and the station's own dependency graph. Nothing in a briefing comes from outside that context, and the evidence panel lists the exact facts each conclusion rests on.
- **Ranked output, not prose.** A headline, a risk level, then between three and six actions each with the reading or dependency behind it, who owns it and the window it fits in, plus a watch list and the evidence list.
- **Six focus areas**: daily briefing, power and heat, the water path, connectivity, the sea lift and field safety. Changing the focus regenerates the briefing for that subject, and arrival on the screen produces one automatically so it is never an empty form.
- **Real analysis, not a prompt.** The worst three channels out of band become the first actions; generation under fifteen percent headroom raises a reserve action rather than a note; a continuity drop inside two hours raises the fallback-profile and outbox actions; the dependency graph is searched for the widest single-point shutdown and the drill slot is pointed at it; the repair log is scanned for the channel that keeps coming back; and the sea lift line is computed from the same voyage model the tracker draws.
- **Follow-up questions** go to the same assistant with the same live context, so anything the briefing raised can be interrogated in place.
- **Two engines, one shape.** With `GROQ_API_KEY` the briefing is written by `llama-3.3-70b-versatile` in JSON mode against a live context block and validated before it reaches the screen, with the deterministic findings kept as the evidence list. Without a key the same briefing is produced by the rule engine, so the screen always works offline.

### NPDC metadata and roles

- Metadata is auto-tagged with CF-1.11 standard names and GCMD keywords, validated against the National Polar Data Centre submission standard `NPDC-DS-01`, and exported as schema.org Dataset JSON-LD. Every export is also written to the audit chain.
- Four role views ship: **Admin**, **Commander**, **Scientist** and **Station**. The role view filters navigation, gates actions such as continuity drills and dataset publication, and changes what the console emphasises.

## Architecture

- **Frontend**: Vite, React 19, React Router, Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts
- **3D**: three.js with `@react-three/fiber` and `@react-three/drei`
- **Backend and database**: Convex (queries, mutations, actions, cron jobs)
- **Auth**: Convex Auth email one-time code plus anonymous guest sessions
- **Transport**: MQTT over WebSocket to HiveMQ, IndexedDB outbox for store-and-forward

### Convex modules

| Module | Responsibility |
| --- | --- |
| `schema.ts` | Stations, telemetry, alerts, personnel, microgrid, weather, satellite passes, command logs, documents, expeditions, blackout events, NPDC exports, cascade runs, repair log, wildlife sightings, self-tests |
| `sensors.ts` | Single source of truth for equipment, thresholds and the simulation model |
| `telemetry.ts` | Ten second simulation tick, live readings, history, alert lifecycle |
| `ops.ts` | Rosters, microgrid, weather, satellite passes, ice velocity, sixty second ops tick |
| `records.ts` | Hash-chained audit log, NCPOR library, expeditions, NPDC exports |
| `blackout.ts` | Continuity prediction, blackout simulation and reconciliation |
| `cascadeGraph.ts` | Pure dependency model and deterministic propagation engine, shared by the server and the console |
| `cascade.ts` | Cascade drill execution, persistence and audit logging |
| `repairs.ts` | Telemetry repair procedures, repair log, FPGA self-test recording |
| `wildlife.ts` | Species sighting log per station, census and per-species totals read by the twin's species cards |
| `assistant.ts` | Groq station assistant with live context injection and general knowledge |
| `advisor.ts` | Grounded station briefings: ranked actions, owners, windows, watch list and the evidence behind each line, written by llama-3.3-70b over live context or by a deterministic rule engine |
| `seed.ts` | Idempotent seeding of stations, telemetry, rosters, plant history, passes, library, expeditions and the audit chain |
| `crons.ts` | Ten second sensor tick and sixty second operations tick |

## Running the project

```bash
bun install
bun convex dev          # push functions and start codegen (platform-managed here)
bun tsc -b --noEmit     # typecheck
bun run dev             # vite dev server
```

The platform seeds itself: opening the dashboard runs `bootstrap.ensureSeeded` once, which creates the four stations, backfills telemetry and populates the operations data set.

### Environment

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Enables the station assistant and the AI advisor on `llama-3.3-70b-versatile`. Set it as a deployment secret in the project's Keys tab, never in the source. Without it the assistant answers from a deterministic local rule engine and a built-in polar reference set over the same live context, and the advisor produces its briefing from a deterministic rule engine over the same live inputs. The console states which engine answered, so a missing key is visible rather than silent. |
No key is required for Open-Meteo weather, the keyless Google Maps and Google Earth links, or the public HiveMQ broker. The supply-ship tracker uses the keyless Google Maps embed, so there is no browser-side map key in this project to leak; if a Maps JavaScript key is ever added it is a public key and must be restricted by HTTP referrer at Google before it is used.

Nothing under `src/` reads a key. The only variables the browser sees are Vite's own `VITE_`-prefixed values, which are the Convex deployment URL and the platform's public app and monitoring identifiers.

## Demo flow for judges

1. **Land** on the public page, then enter the command centre and sign in.
2. **Sensor Dashboard** - watch the ten second tick refresh every channel; open the featured chart.
3. **Alert Triage** - read the incident matrix, acknowledge a critical, resolve a warning.
4. **Station Dashboard** - show the roster, badge state, duty board and queue a roll call.
5. **Microgrid and CHP** - show load versus supply, thermal recovery and plant advisories.
6. **Digital Twin 3D** - switch station, cycle the seven view modes, open the 2.5D cutaway, click hotspots.
7. **Continuity drill** - press Simulate Satellite Blackout, watch the red pulsing overlay for 60 seconds, then read the predicted versus actual reconciliation.
8. **Antarctic Mode** - toggle from the top bar or press Ctrl+Shift+A, send a check-in, then the SOS.
9. **Offline sync** - the sync badge shows the outbox draining to broker.hivemq.com.
10. **Weather Extension** - the Open-Meteo graphs and the 7 day forecast strip.
11. **NPDC Compliance Centre** - run the gates, export the metadata package, show the audit entry.
12. **Audit Trail** - show the head digest, verified chain and the export record you just created.
13. **Drone tour** - in the twin, pick Drone Tour and let it narrate two or three stops, then switch to Exterior and drag to show the camera is free.
14. **Cascade Drill** - trigger the generator hall at critical, run it, then tick the isolation points in the plan and watch the response window and resilience index move before recording the drill.
15. **Repair Bay** - open a fault, read the procedure, apply it and show the incident closing and the channel returning to band; then run the FPGA self-test and read the PASS verdict and the scrub interval verdict.
16. **Resupply Voyage** - show the ship mid-passage, the noon reports, the route chart and the Google Maps and Google Earth links.
17. **Wildlife and the expedition member** - in the twin, click the Adelie colony for its species card, record a sighting, then press **Go to his desk inside** to land in the command room facing Dev Khandhediya at his admin desk, and click the desk to open the same card indoors.
18. **Walk the site and the field badge** - back outside, press **Walk the site**, click the canvas and walk the apron; then open the Field badge card in the right rail to show the level, the XP bar and the badge just won.
19. **Station assistant** - press Ctrl/Cmd + K, ask an operational question, then ask a general one to show it answers both.
20. **AI Advisor** - open `/advisor`, let it write the daily briefing on arrival, read the ranked actions with their owners and windows, then switch the focus to the water path and to the sea lift to show the same live data producing a different briefing.
21. **Click-to-label** - in the twin, click the generator hall: the label appears with the live readings and a cross to remove it; click a second object, then press Esc to clear them all and show the site is clean again.
22. **Role views** - switch between Admin, Commander, Scientist and Station to show navigation and action gating.

## Verification

```bash
bun convex dev --once && bun tsc -b --noEmit   # types and backend push
bun run scan:secrets                            # no credential-shaped literal in the source tree
```

All of these pass on the current tree. The secret scan reports one reviewed literal: the auth
provider's shared one-time-code relay credential, which ships with the template and is a relay
identity rather than a project secret.
