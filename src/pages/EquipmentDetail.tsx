import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LiveChart } from "@/pages/Dashboard";
import { AppShell } from "@/components/AppShell";
import { catalogFor } from "@/lib/catalog";
import {
  SUBSYSTEM_LABELS,
  formatAge,
  severityClasses,
  statusClasses,
  stationFromParams,
  type StationSlug,
} from "@/lib/station";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Detail page for one instrumented equipment tag. */
export default function EquipmentDetail() {
  const { equipmentId = "" } = useParams();
  const [params] = useSearchParams();
  const slug = stationFromParams(params) as StationSlug;

  const readings = useQuery(api.telemetry.getLiveReadings, { slug });
  const notes = useQuery(api.admin.listNotes, {
    stationSlug: slug,
    equipmentId,
    limit: 10,
  });

  const entry = catalogFor(slug).find((e) => e.equipmentId === equipmentId);

  if (!entry) {
    return (
      <AppShell>
        <Card className="cc-panel border-border shadow-none">
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium">Equipment tag not found.</p>
            <p className="text-sm text-muted-foreground">
              {equipmentId} is not instrumented at this station.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <a href={`/catalog?station=${slug}`}>Back to catalog</a>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const channelReadings = readings?.filter((r) => r.equipmentId === equipmentId) ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="cc-label">
              Equipment - {slug === "maitri" ? "Maitri" : "Bharati"}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{entry.name}</h1>
            <p className="cc-mono mt-1 text-xs text-muted-foreground">
              {entry.equipmentId} - {SUBSYSTEM_LABELS[entry.subsystem] ?? entry.subsystem}
            </p>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">
            {entry.sensors.length} live channel{entry.sensors.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Overview + specs */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="cc-panel border-border shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-foreground">{entry.description}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {entry.specs.map((s) => (
                  <div key={s.label} className="rounded-md border border-border bg-card p-3">
                    <div className="cc-label">{s.label}</div>
                    <div className="cc-mono mt-1 text-sm text-foreground">{s.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="cc-panel border-border shadow-none">
            <CardHeader>
              <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                Telemetry thresholds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {channelReadings.map((r) => {
                const t = r.thresholds;
                const parts: string[] = [];
                if (t.critLow !== undefined) parts.push(`crit < ${t.critLow}${r.unit}`);
                if (t.warnLow !== undefined) parts.push(`warn < ${t.warnLow}${r.unit}`);
                if (t.warnHigh !== undefined) parts.push(`warn > ${t.warnHigh}${r.unit}`);
                if (t.critHigh !== undefined) parts.push(`crit > ${t.critHigh}${r.unit}`);
                return (
                  <div key={r.sensorId} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                    <span className="text-muted-foreground">{r.parameter}</span>
                    <span className="cc-mono text-[10px] text-foreground">
                      {parts.length > 0 ? parts.join(" / ") : "informational"}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Live channels */}
        <Card className="cc-panel border-border shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              Live channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {readings === undefined ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {channelReadings.map((r) => {
                  const cls = statusClasses(r.status);
                  return (
                    <div key={r.sensorId} className="rounded-md border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{r.parameter}</div>
                          <div className="cc-mono text-[10px] text-muted-foreground">{r.sensorId}</div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            cls.text,
                            cls.bg,
                            cls.border,
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", cls.dot)} />
                          {r.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className={cn("cc-mono text-2xl", cls.text)}>
                          {r.value.toFixed(r.decimals)}
                        </span>
                        <span className="text-xs text-muted-foreground">{r.unit}</span>
                        <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                          {r.timestamp > 0 ? formatAge(r.timestamp) : "no data"}
                        </span>
                      </div>
                      <div className="mt-3">
                        <LiveChart
                          slug={slug}
                          equipmentId={r.equipmentId}
                          sensorId={r.sensorId}
                          thresholds={r.thresholds}
                          unit={r.unit}
                          status={r.status}
                          height={160}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Field notes */}
        <NotesSection
          slug={slug}
          equipmentId={equipmentId}
          notes={notes}
        />
      </div>
    </AppShell>
  );
}

/** Field notes list plus comment thread for one equipment tag. */
function NotesSection({
  slug,
  equipmentId,
  notes,
}: {
  slug: StationSlug;
  equipmentId: string;
  notes:
    | Array<{
        _id: string;
        title: string;
        body: string;
        kind: string;
        equipmentId: string;
        sensorId?: string;
        createdAt: number;
        authorName: string;
      }>
    | undefined;
}) {
  const addComment = useMutation(api.admin.addComment);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const submitComment = async (noteId: string) => {
    const body = (commentDrafts[noteId] ?? "").trim();
    if (!body) return;
    try {
      await addComment({ noteId: noteId as never, body });
      setCommentDrafts((d) => ({ ...d, [noteId]: "" }));
      toast.success("Comment posted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment.");
    }
  };

  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader>
        <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
          Operator field notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes === undefined ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No field notes for this equipment yet. Post the first observation from the workspace.
          </p>
        ) : (
          notes.map((n) => (
            <NoteWithComments
              key={n._id}
              note={n}
              open={!!openComments[n._id]}
              onToggle={() =>
                setOpenComments((o) => ({ ...o, [n._id]: !o[n._id] }))
              }
              draft={commentDrafts[n._id] ?? ""}
              onDraftChange={(v) =>
                setCommentDrafts((d) => ({ ...d, [n._id]: v }))
              }
              onSubmit={() => void submitComment(n._id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/** One note with its expandable comment thread. */
function NoteWithComments({
  note,
  open,
  onToggle,
  draft,
  onDraftChange,
  onSubmit,
}: {
  note: {
    _id: string;
    title: string;
    body: string;
    kind: string;
    createdAt: number;
    authorName: string;
  };
  open: boolean;
  onToggle: () => void;
  draft: string;
  onDraftChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const comments = useQuery(
    api.admin.listComments,
    open ? { noteId: note._id as never } : "skip",
  );
  const sev = severityClasses(note.kind === "question" ? "watch" : note.kind === "maintenance" ? "warning" : "nominal");

  return (
    <div className={cn("rounded-md border p-4", sev.border)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("text-[10px] uppercase", sev.text, sev.border)}>
          {note.kind}
        </Badge>
        <span className="text-sm font-medium">{note.title}</span>
        <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
          {note.authorName} - {formatAge(note.createdAt)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{note.body}</p>
      <div className="mt-3">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={onToggle}>
          <MessageSquare className="mr-1 size-3.5" />
          {open ? "Hide discussion" : "Discussion"}
        </Button>
      </div>
      {open && (
        <div className="mt-2 space-y-3 border-t border-border pt-3">
          {comments === undefined ? (
            <div className="flex h-12 items-center justify-center">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="rounded border border-border bg-card p-3">
                <div className="cc-mono text-[10px] text-muted-foreground">
                  {c.authorName} - {formatAge(c.createdAt)}
                </div>
                <p className="mt-1 text-sm text-foreground">{c.body}</p>
              </div>
            ))
          )}
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Add to the discussion..."
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
            <Button size="icon" variant="outline" aria-label="Post comment" onClick={onSubmit}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
