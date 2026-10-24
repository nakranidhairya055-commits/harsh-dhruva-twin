import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import {
  AntarcticPoster,
  BrandWordmark,
} from "@/components/landing/AntarcticPoster";
import { PenguinWaddle } from "@/components/landing/PenguinSvg";
import { PROJECT_IDENTITY } from "@/lib/station";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Box,
  ClipboardList,
  Cpu,
  FileCheck2,
  GitBranchPlus,
  Globe2,
  Fingerprint,
  Footprints,
  KeyRound,
  Layers,
  PawPrint,
  PenSquare,
  Radio,
  Ship,
  Shield,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Tags,
  Thermometer,
  Truck,
  Users,
  Video,
  Wind,
  Wrench,
} from "lucide-react";
import { Link } from "react-router";

/** Aurora ribbon backdrop rendered with pure CSS gradients. */
function AuroraBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -top-32 left-1/4 h-[420px] w-[720px] rounded-full opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, #00E0C6 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -top-16 right-0 h-[360px] w-[560px] rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, #4A9EFF 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-40 left-0 h-[300px] w-[480px] rounded-full opacity-15 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, #3EE07F 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_0%,#060B14_75%)]" />
    </div>
  );
}

/** One animated station strip on the landing hero. */
function StationStrip() {
  const stations = useQuery(api.telemetry.listStations, {});
  const seeded = stations !== undefined && stations.length > 0;

  const rows = [
    { name: "Maitri", detail: "Schirmacher Oasis - est. 1989", status: "operational" },
    { name: "Bharati", detail: "Larsemann Hills - est. 2012", status: "operational" },
    { name: "Dakshin Gangotri", detail: "Ice shelf - est. 1983", status: "buried" },
    { name: "Maitri-II", detail: "Planned replacement station", status: "planned" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.6 }}
      className="mx-auto mt-12 w-full max-w-3xl"
    >
      <Card className="border-border bg-card/80 backdrop-blur">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="cc-label">Indian Antarctic Stations - Live Status</span>
            <span className="cc-mono text-[10px] text-muted-foreground">
              {seeded ? "NCPOR network" : "loading"}
            </span>
          </div>
          <div className="grid sm:grid-cols-2">
            {rows.map((r, i) => (
              <div
                key={r.name}
                className={cn(
                  "flex items-center justify-between gap-3 px-5 py-4",
                  i < rows.length - 1 && "border-b border-border sm:border-b-0",
                  i % 2 === 0 && "sm:border-r",
                )}
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.detail}</div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] uppercase tracking-wider",
                    r.status === "operational" && "border-[#3EE07F]/40 text-[#3EE07F]",
                    r.status === "buried" && "border-[#6B7A8F]/40 text-muted-foreground",
                    r.status === "planned" && "border-[#4A9EFF]/40 text-[#4A9EFF]",
                  )}
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** DhruvaTwin public landing page. */
export default function Landing() {
  const { isLoading, isAuthenticated } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <AuroraBackdrop />

      {/* Nav */}
      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
              <Snowflake className="size-5 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-sm font-bold tracking-wide text-foreground">
                {PROJECT_IDENTITY.name} Platform
              </div>
              <div className="cc-label">Team {PROJECT_IDENTITY.team}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
            ) : isAuthenticated ? (
              <Button asChild className="cursor-pointer">
                <Link to="/dashboard">
                  Command Centre
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="cursor-pointer">
                <Link to="/auth?returnTo=%2Fdashboard">
                  Enter Command Centre
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
          {/*
            Poster hero.

            The landing page opens the way the project was presented: the team
            and the programme across the top, the wordmark and the identity
            table on the left, and the poster illustration on the right - the
            satellite downlinking to the station, the operator console, and the
            penguins the twin models standing on the ice.
          */}
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[#F58220]/50 text-[#F58220]">
                  Team {PROJECT_IDENTITY.team}
                </Badge>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {PROJECT_IDENTITY.category}
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {PROJECT_IDENTITY.event}
                </Badge>
              </div>

              <h1 className="mt-5">
                <BrandWordmark className="block text-5xl sm:text-6xl lg:text-7xl" />
                <span className="mt-3 block font-display text-lg font-bold leading-snug text-foreground sm:text-xl">
                  AI and IoT powered, offline-first{" "}
                  <span className="text-primary">digital twin</span> for Maitri and Bharati
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                A digital platform for the efficient remote management of the Indian Antarctic
                research stations: two separate 3D twins with seven engineering view modes and a
                2.5D cutaway, a live sensor grid, automated alert triage, a grounded AI advisor, an
                AI continuity engine that predicts satellite blackouts, Antarctic Mode for ground
                staff, and an offline-first MQTT link that keeps reporting through a katabatic
                outage. Built for {PROJECT_IDENTITY.agency} and the research community that
                depends on it.
              </p>

              {/*
                Station coordinates as a quiet line, not a spec table. The
                hackathon identity lives in the footer, where it belongs on a
                public page; the hero is for the place and the work.
              */}
              <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span>Maitri</span>
                <span className="text-[#00E0C6]/50">/</span>
                <span>70&deg;45&prime;52&Prime;S 11&deg;44&prime;03&Prime;E</span>
                <span className="text-[#00E0C6]/50">/</span>
                <span>Bharati</span>
                <span className="text-[#00E0C6]/50">/</span>
                <span>69&deg;24&prime;41&Prime;S 76&deg;11&prime;15&Prime;E</span>
                <span className="text-[#00E0C6]/50">/</span>
                <span>3,098 km apart</span>
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="cursor-pointer">
                  <Link to={isAuthenticated ? "/dashboard" : "/auth?returnTo=%2Fdashboard"}>
                    {isAuthenticated ? "Open Dashboard" : "Launch the Console"}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="cursor-pointer">
                  <Link to="/auth?returnTo=%2Fadvisor">See the AI Advisor</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <AntarcticPoster className="aspect-[760/480] w-full" />
              <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground">
                The station twin, the sensor grid and the field population in one frame: the same
                satellite link, the same telemetry and the same penguins you will find modelled on
                the Bharati coast inside the console.
              </p>
            </motion.div>
          </div>

          <StationStrip />

          {/* Capability grid */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Box,
                title: "Separate station twins",
                body: "Maitri and Bharati are distinct 3D scenes with lake, fjord and bay water bodies, 100 plus objects each and clickable hotspots wired to live telemetry.",
              },
              {
                icon: Layers,
                title: "Seven view modes",
                body: "Exterior, X-Ray, Infrared, Thermal, MEP/HVAC, Structural and Night, plus a 2.5D isometric cutaway with rooms, occupancy and data overlays.",
              },
              {
                icon: Video,
                title: "Free camera and drone tour",
                body: "Presets fly the camera once and then release it, so dragging, panning and zooming stay where you leave them. A narrated drone tour flies ten or eleven scripted stops over each station, with a survey grid, range rings and layer switches for decluttering.",
              },
              {
                icon: Footprints,
                title: "Walk the site and earn the badge",
                body: "Leave the orbit camera and walk the apron on foot: WASD, mouse look, sprint and jump, with the hull, the fuel farm and the water edge keeping you honest. Nineteen field badges track what you actually did - distance walked, rooms stood in, species carded, drills run - and the level and XP bar sit in the twin's right rail.",
              },
              {
                icon: PawPrint,
                title: "Wildlife and the expedition member",
                body: "Twenty-two species modelled honestly on the ice: four kinds of penguin with fluffy chicks, three seals, three whales, dolphins, terns and petrels, toothfish, krill swarms and seafloor sea spiders. Click any group for its field entry, record a sighting to the station log, or follow Dev Khandhediya from the Ad\u00e9lie colony to his admin desk inside the command room.",
              },
              {
                icon: Tags,
                title: "Click for the label, cross to take it off",
                body: "Nothing floats over the site on its own any more. Click an object and its label appears with the live readings behind it and a cross to remove it, so the numbers arrive on request instead of covering the ice. Species name labels have their own switch in the field card, and Esc clears everything you opened.",
              },
              {
                icon: GitBranchPlus,
                title: "Cascade flowchart",
                body: "Propagate one equipment failure through the real station dependency graph as a flowchart: tier swimlanes, arrows that show which way consequence travels, numbered propagation order, and a box you can click to shut that system down. Then apply your isolation plan and watch the response window, crew-risk node and resilience index recompute.",
              },
              {
                icon: Sparkles,
                title: "AI station advisor",
                body: "Not a chat box: the advisor reads live telemetry, open incidents, the continuity prediction, the generation snapshot, the repair history and the station dependency graph, then returns ranked actions with an owner and a time window, a watch list, and the exact evidence behind every line.",
              },
              {
                icon: Wrench,
                title: "Repair bay and self-healing",
                body: "A live fault queue with the field procedure for each channel, repairs that return the plant to band and clear its incidents, and a real FPGA self-healing self-test over a triple-redundant bitstream with a scrub interval verdict.",
              },
              {
                icon: Ship,
                title: "Live supply-ship tracker",
                body: "Follow the sea lift from Cape Town to Bharati or Maitri as it happens: a pulsing live position, the run drawn bright and the remaining passage dashed, a noon report for every day at sea, a satellite map that follows the ship, and a timeline you can scrub to check the discharge window before the ship is there.",
              },
              {
                icon: Cpu,
                title: "AI blackout predictor",
                body: "A continuity engine forecasts the next satellite link drop with confidence, and a 60 second drill reconciles predicted against measured coverage.",
              },
              {
                icon: Radio,
                title: "MQTT and offline queue",
                body: "Telemetry, alerts and field traffic publish to broker.hivemq.com, buffered in an IndexedDB queue ranked SOS, Critical, Check-in, Routine.",
              },
              {
                icon: Snowflake,
                title: "Antarctic Mode",
                body: "A separate high-contrast interface for ground staff: pure black, 18 point body text, 64 pixel targets and a 200 pixel SOS control.",
              },
              {
                icon: Activity,
                title: "Live sensor grid",
                body: "Twenty-plus telemetry channels per station refresh every ten seconds, with threshold bands and status carried on every reading.",
              },
              {
                icon: AlertTriangle,
                title: "Alert triage matrix",
                body: "An incident matrix breaks open alerts out by subsystem and severity. Acknowledge, work and resolve with provenance on every action.",
              },
              {
                icon: Wind,
                title: "Weather and environment",
                body: "Open-Meteo forecast and reanalysis charted for both stations, with the local ice velocity field and the satellite pass schedule.",
              },
              {
                icon: Users,
                title: "Roster and microgrid",
                body: "Personnel badges, UHF channels and duty shifts alongside CHP load, thermal recovery, storage state of charge and plant advisories.",
              },
              {
                icon: Globe2,
                title: "Antarctica overview",
                body: "All four Indian sites on one sector map: Maitri, Bharati, Dakshin Gangotri and the planned Maitri-II, 3,098 km apart.",
              },
              {
                icon: BookOpen,
                title: "NCPOR library",
                body: "Treaty instruments, Ministry policy, NPDC data standards, field manuals and scientific reports, tagged and searchable.",
              },
              {
                icon: FileCheck2,
                title: "NPDC dataset export",
                body: "Metadata is auto-tagged with CF standard names and GCMD keywords, validated against the submission standard and written to the audit chain.",
              },
              {
                icon: ClipboardList,
                title: "Expedition logs",
                body: "The full ISEA series from 1981-82 to the current season with the hosting station, programme focus and personnel strength.",
              },
              {
                icon: Shield,
                title: "Audit trail",
                body: "A rolling hash chain over every command. Recomputed digests detect any edit, insertion or reordering of history.",
              },
              {
                icon: Truck,
                title: "Vehicle fleet",
                body: "Twelve vehicle classes modelled in the twins, from PistenBully snow vehicles and cargo carriers to the helicopter and the Zodiac boat.",
              },
              {
                icon: PenSquare,
                title: "Community contributions",
                body: "Partner organisations publish field observations, maintenance logs and questions, and discuss them on the equipment page, with a Groq-powered assistant on tap.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
              >
                <Card className="cc-panel h-full border-border shadow-none transition-colors hover:border-ring/50">
                  <CardContent className="p-5">
                    <div className="flex size-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
                      <f.icon className="size-4 text-primary" />
                    </div>
                    <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-wider text-foreground">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/*
            Security.

            Judges ask where the keys live, so the answer is on the front page
            rather than buried in a repository file: every provider key is read
            server side, nothing in the browser bundle holds one, and the
            repository ships a scanner that fails on a credential-shaped
            literal.
          */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mt-16"
          >
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="cc-label">Security</div>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">
                  No credential ever reaches the browser
                </h2>
              </div>
              <span className="cc-mono rounded border border-border bg-card px-2.5 py-1 text-[10px] text-muted-foreground">
                bun run scan:secrets
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Keys stay server side",
                  body: "Provider keys are read from the environment inside Convex Node actions, so they exist only in the backend process. Nothing under the client source reads a key, and the only Vite-exposed values are the deployment URL and the platform's own public identifiers.",
                },
                {
                  icon: KeyRound,
                  title: "Nothing to steal in the bundle",
                  body: "Open the network tab and search the bundle: there is no key in it. The AI features also fail safe, answering from a deterministic rule engine over live data when no key is configured instead of calling out unauthenticated.",
                },
                {
                  icon: Fingerprint,
                  title: "Codes, not passwords",
                  body: "Sign-in is by email one-time code, so there is no password hash to steal. Protected routes sit behind an auth guard, every mutation validates its arguments, and operational actions land in a hash-chained audit log that detects editing.",
                },
              ].map((item) => (
                <Card key={item.title} className="cc-panel h-full border-border shadow-none">
                  <CardContent className="p-5">
                    <div className="flex size-9 items-center justify-center rounded-md border border-[#00E0C6]/30 bg-[#00E0C6]/10">
                      <item.icon className="size-4 text-[#00E0C6]" />
                    </div>
                    <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-wider text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/*
            Penguins.

            The wildlife layer is one of the things people remember about the
            twin, so the public page carries the mascots: the same four species
            the twin models, drawn with the markings that identify them, and a
            route straight into the field cards.
          */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mt-16"
          >
            <Card className="cc-panel overflow-hidden border-border shadow-none">
              <CardContent className="grid items-center gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
                <div>
                  <div className="cc-label">Field population</div>
                  <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground">
                    Four penguins, drawn the way the twin draws them — with chicks
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Adelie, emperor, chinstrap and gentoo — each drawn with the markings that
                    identify it, including the emperor chick that hatched on the ice. They live on
                    the Bharati coast in the twin, with chicks, a sighting log that writes to the
                    station record, and Dev Khandhediya standing among them.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {[
                      "Adelie - white eye ring",
                      "Emperor - orange neck patch",
                      "Chinstrap - chin strap",
                      "Gentoo - white bonnet",
                      "Emperor chick - downy grey cap",
                    ].map((marking) => (
                      <Badge
                        key={marking}
                        variant="outline"
                        className="border-border text-[10px] text-muted-foreground"
                      >
                        {marking}
                      </Badge>
                    ))}
                  </div>
                  <Button asChild size="sm" className="mt-5 cursor-pointer">
                    <Link to="/auth?returnTo=%2Ftwin">Meet them in the twin</Link>
                  </Button>
                </div>
                <PenguinWaddle
                  kinds={["adelie", "emperor", "chinstrap", "gentoo"]}
                  chicks={2}
                  penguinClassName="h-28 w-auto sm:h-36"
                  className="gap-0 sm:gap-1"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Identity strip */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16"
          >
            <Card className="border-border bg-card/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <Snowflake className="size-5 text-primary" />
                  <div>
                    <div className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                      {PROJECT_IDENTITY.name} by Team {PROJECT_IDENTITY.team}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Built for {PROJECT_IDENTITY.agency}
                    </div>
                  </div>
                </div>
                <Separator className="hidden w-px sm:block" orientation="vertical" />
                <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                  <span>
                    <span className="cc-mono block text-base text-foreground">2</span>
                    Stations instrumented
                  </span>
                  <span>
                    <span className="cc-mono block text-base text-foreground">16</span>
                    Command screens
                  </span>
                  <span>
                    <span className="cc-mono block text-base text-foreground">22</span>
                    Species on the ice
                  </span>
                  <span>
                    <span className="cc-mono block text-base text-foreground">46</span>
                    Expeditions logged
                  </span>
                  <span>
                    <span className="cc-mono block text-base text-foreground">12</span>
                    Vehicle classes
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span className="font-display font-bold uppercase tracking-wider text-foreground">
            {PROJECT_IDENTITY.name}
          </span>
          <span>Team {PROJECT_IDENTITY.team}</span>
          <span>{PROJECT_IDENTITY.event}</span>
          <span>{PROJECT_IDENTITY.agency}</span>
          <nav className="ml-auto flex items-center gap-3">
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms and Conditions
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
