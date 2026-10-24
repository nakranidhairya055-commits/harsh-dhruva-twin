import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { catalogFor } from "@/lib/catalog";
import { formatAge, stationFromParams } from "@/lib/station";
import { FileUp, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

/** Note kinds offered when posting. */
const KINDS = [
  { value: "observation", label: "Observation" },
  { value: "maintenance", label: "Maintenance log" },
  { value: "question", label: "Question" },
] as const;

/** Station equipment selector built from the catalog. */
function EquipmentSelect({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const entries = useMemo(() => catalogFor(slug), [slug]);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Choose equipment" />
      </SelectTrigger>
      <SelectContent>
        {entries.map((e) => (
          <SelectItem key={e.equipmentId} value={e.equipmentId}>
            {e.name} ({e.equipmentId})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Operator workspace: publish content and manage your own contributions. */
export default function Workspace() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);

  const myNotes = useQuery(api.admin.listMyNotes, {});
  const postNote = useMutation(api.admin.postNote);
  const removeNote = useMutation(api.admin.removeNote);

  const [kind, setKind] = useState<string>("observation");
  const [equipmentId, setEquipmentId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!equipmentId) {
      setError("Choose the equipment this entry is about.");
      return;
    }
    setPosting(true);
    try {
      await postNote({
        stationSlug: slug,
        equipmentId,
        title: title.trim(),
        body: body.trim(),
        kind: kind as "observation" | "maintenance" | "question",
      });
      toast.success("Published to the station feed.");
      setTitle("");
      setBody("");
      setEquipmentId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (noteId: string) => {
    try {
      await removeNote({ noteId: noteId as never });
      toast.success("Entry removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="cc-label">Workspace</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Your operator workspace</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Publish field observations, maintenance logs and questions against any
            instrumented equipment tag. Everything you post appears on the equipment
            page for the whole programme and carries your operator attribution.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Post form */}
          <Card className="cc-panel border-border shadow-none">
            <CardHeader>
              <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                Publish an entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kind">Entry type</Label>
                    <Select value={kind} onValueChange={setKind}>
                      <SelectTrigger id="kind" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => (
                          <SelectItem key={k.value} value={k.value}>
                            {k.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Equipment</Label>
                    <EquipmentSelect
                      slug={slug}
                      value={equipmentId}
                      onChange={setEquipmentId}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Heat-trace current spike on the lake pipeline"
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Details</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="What did you observe, what was done, or what do you need answered? Include sensor values and conditions where relevant."
                    rows={6}
                    required
                    maxLength={4000}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full cursor-pointer" disabled={posting}>
                  {posting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <FileUp className="mr-2 size-4" />
                  )}
                  {posting ? "Publishing..." : "Publish entry"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My contributions */}
          <Card className="cc-panel border-border shadow-none">
            <CardHeader>
              <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                Your contributions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myNotes === undefined ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : myNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing published yet. Your first observation is a good place to start.
                </p>
              ) : (
                myNotes.map((n) => (
                  <div
                    key={n._id}
                    className="rounded-md border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {n.kind}
                      </Badge>
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                        {n.stationName} - {formatAge(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {n.body}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <a
                        href={`/equipment/${n.equipmentId}?station=${n.stationSlug}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View on equipment page
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => void remove(n._id)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
