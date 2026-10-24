import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COLONIES, DEV_PROFILE, SPECIES } from "./wildlife-data";
import { setTwinDisplay, useTwinDisplay } from "../twin-primitives";
import { award } from "@/lib/achievements";
import { formatAge, type StationSlug } from "@/lib/station";
import { cn } from "@/lib/utils";
import {
  Bird,
  Bug,
  Camera,
  Crosshair,
  Fish,
  MapPin,
  PawPrint,
  Tags,
  TreePine,
  UserRound,
  Waves,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const GROUP_ICON = {
  penguin: PawPrint,
  seal: PawPrint,
  whale: Waves,
  dolphin: Waves,
  bird: Bird,
  fish: Fish,
  invertebrate: Bug,
} as const;

const GROUP_LABEL: Record<string, string> = {
  penguin: "Penguin",
  seal: "Seal",
  whale: "Whale",
  dolphin: "Dolphin",
  bird: "Seabird",
  fish: "Shoal and swarm",
  invertebrate: "Benthic life",
};

/**
 * Species card and expedition member card.
 *
 * Selecting any animal in the twin opens this panel: what the species is, where
 * it is in the scene, how many are modelled, the recorded sighting log for the
 * station, and a button to fly the camera to the colony. The expedition member
 * gets his own profile with a jump to his desk inside the station.
 */
export function WildlifePanel({
  slug,
  selectedId,
  onClose,
  onFocus,
  onFocusDesk,
}: {
  slug: StationSlug;
  selectedId: string;
  onClose: () => void;
  /** Fly the camera to a colony. */
  onFocus: (speciesId: string) => void;
  /** Enter the interior at the expedition member's admin desk. */
  onFocusDesk: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const display = useTwinDisplay();
  const sightings = useQuery(api.wildlife.listSightings, { slug, limit: 30 });
  const recordSighting = useMutation(api.wildlife.recordSighting);

  const isMember = selectedId === DEV_PROFILE.id;
  const species = isMember ? null : SPECIES[selectedId];
  const colony = isMember
    ? undefined
    : (COLONIES[slug] ?? []).find((entry) => entry.speciesId === selectedId);
  const elsewhere = species && species.station !== slug;

  const sceneColonies = COLONIES[slug] ?? [];
  const recorded = (sightings?.sightings ?? []).filter((row) => row.speciesId === selectedId);
  const modelled = sceneColonies
    .filter((entry) => entry.speciesId === selectedId)
    .reduce((sum, entry) => sum + entry.count + (entry.chicks ?? 0), 0);
  const modelledTotal = sceneColonies.reduce(
    (sum, entry) => sum + entry.count + (entry.chicks ?? 0),
    0,
  );
  const speciesCount = new Set(sceneColonies.map((entry) => entry.speciesId)).size;

  const submit = async () => {
    if (isMember) return;
    const count = Math.max(1, colony?.count ?? 1);
    setBusy(true);
    try {
      await recordSighting({
        slug,
        speciesId: selectedId,
        speciesName: species?.name ?? selectedId,
        count,
        location: colony?.label ?? species?.seen ?? "station apron",
        note: "Recorded from the digital twin sighting log.",
      });
      award("sighting");
      toast.success(`${species?.name ?? "Species"} sighting recorded at ${count}`);
    } catch (error) {
      toast.error(`Sighting not recorded: ${String(error).slice(0, 140)}`);
    } finally {
      setBusy(false);
    }
  };

  if (!isMember && !species) return null;
  const Icon = isMember ? UserRound : GROUP_ICON[species!.group];

  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-primary" />
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              {isMember ? "Expedition member" : GROUP_LABEL[species!.group]}
            </CardTitle>
          </div>
          <p className="mt-1 text-sm font-semibold leading-tight text-foreground">
            {isMember ? DEV_PROFILE.name : species!.name}
          </p>
          <p className="cc-mono text-[10px] italic text-muted-foreground">
            {isMember ? DEV_PROFILE.role : species!.latin}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close wildlife card" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {isMember ? DEV_PROFILE.blurb : species!.blurb}
        </p>

        {isMember ? (
          <div className="rounded border border-border px-3 py-2">
            <div className="cc-label text-[9px]">On station</div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {DEV_PROFILE.seen}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Length", species!.length],
              ["Mass", species!.mass],
              ["Diet", species!.diet],
              ["Status", species!.status],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-border px-2.5 py-1.5">
                <div className="cc-label text-[9px]">{label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-foreground">{value}</div>
              </div>
            ))}
          </div>
        )}

        {!isMember && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
              <MapPin className="mr-1 size-3" />
              {species!.seen}
            </Badge>
            <Badge variant="outline" className="border-[#00E0C6]/40 text-[10px] text-[#7DF3E4]">
              {modelled > 0 ? `${modelled} modelled in this scene` : "not placed in this scene"}
            </Badge>
            {recorded.length > 0 && (
              <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                <Camera className="mr-1 size-3" />
                {recorded.length} recorded sighting{recorded.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        )}

        <ul className="space-y-1.5 border-l-2 border-primary/40 pl-3">
          {(isMember ? DEV_PROFILE.facts : species!.facts).map((fact) => (
            <li key={fact} className="text-[11px] leading-relaxed text-muted-foreground">
              {fact}
            </li>
          ))}
        </ul>

        {/*
          The operator's switch over the labels drawn in the scene. The facts
          stay in this card either way, so turning the labels off declutters the
          ice without losing any of the information.
        */}
        <button
          type="button"
          onClick={() => setTwinDisplay({ wildlifeLabels: !display.wildlifeLabels })}
          aria-pressed={display.wildlifeLabels}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
            display.wildlifeLabels
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="flex items-center gap-1.5">
            <Tags className="size-3" />
            Name labels over the ice
          </span>
          <span>{display.wildlifeLabels ? "on" : "off"}</span>
        </button>

        <div className="flex flex-wrap gap-1.5">
          {isMember ? (
            <>
              <Button size="sm" className="text-[11px]" onClick={onFocusDesk}>
                <MapPin className="mr-1.5 size-3.5" />
                Go to his desk inside
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-[11px]"
                onClick={() => onFocus(DEV_PROFILE.id)}
              >
                <TreePine className="mr-1.5 size-3.5" />
                Stand with him outside
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                className="text-[11px]"
                disabled={!colony}
                onClick={() => onFocus(selectedId)}
              >
                <Crosshair className="mr-1.5 size-3.5" />
                Fly to colony
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-[11px]"
                disabled={busy}
                onClick={() => void submit()}
              >
                <Camera className="mr-1.5 size-3.5" />
                {busy ? "Recording" : "Record sighting"}
              </Button>
            </>
          )}
          {elsewhere && (
            <Button asChild size="sm" variant="outline" className="text-[11px]">
              <a href={`/twin?station=${species!.station}`}>
                <MapPin className="mr-1.5 size-3.5" />
                See it at {species!.station === "maitri" ? "Maitri" : "Bharati"}
              </a>
            </Button>
          )}
        </div>

        {!isMember && (
          <div>
            <div className="cc-label mb-1.5 text-[9px]">
              In this scene - {speciesCount} species, {modelledTotal} animals
            </div>
            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-1">
              {sceneColonies.map((entry) => {
                const def = SPECIES[entry.speciesId];
                if (!def) return null;
                const active = entry.speciesId === selectedId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onFocus(entry.speciesId)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] leading-tight transition-colors",
                      active
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {def.name} · {entry.count + (entry.chicks ?? 0)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onFocus(DEV_PROFILE.id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] leading-tight transition-colors",
                  "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {DEV_PROFILE.name} · on site
              </button>
            </div>
          </div>
        )}

        {!isMember && species && species.station !== slug && (
          <p className="text-[10px] leading-snug text-muted-foreground">
            {slug === "maitri"
              ? "Maitri is about 100 km inland in the Schirmacher Oasis, so the marine species live at the coastal station: penguins, seals, whales, dolphins and the shoals they feed on are all one click away on the Bharati twin. What does breed inland is here: snow petrels, Antarctic petrels, skuas, terns, storm petrels and the invertebrates in the oasis lakes."
              : "Bharati sits on the Larsemann Hills coast, which is why the marine species are placed here rather than at the inland station: penguins, leopard and Weddell seals, minke whales, orcas, dolphins, fish, sea spiders and the krill swarm they all depend on."}
          </p>
        )}

        {!isMember && (
          <div>
            <div className="cc-label mb-1.5 text-[9px]">Sighting log</div>
            {!sightings ? (
              <p className="text-[11px] text-muted-foreground">Loading the sighting log.</p>
            ) : recorded.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Nothing recorded for this species yet. Recording a sighting writes the count, the
                location and the observer to the station record and appends an entry to the audit
                chain.
              </p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {recorded.map((row) => (
                  <div
                    key={row._id}
                    className={cn(
                      "rounded border border-border px-2.5 py-1.5 text-[11px]",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="cc-mono text-foreground">{row.count} counted</span>
                      <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                        {formatAge(row.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-muted-foreground">
                      {row.location} - {row.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
