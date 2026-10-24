import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { cn } from "@/lib/utils";
import { BookOpen, ExternalLink, Hash, Search } from "lucide-react";
import { useMemo, useState } from "react";

const CATEGORY_TONE: Record<string, string> = {
  Policy: "border-[#4A9EFF]/50 text-[#4A9EFF]",
  Protocol: "border-[#00E0C6]/50 text-[#00E0C6]",
  "Data Standard": "border-[#FFB020]/50 text-[#FFB020]",
  "Field Manual": "border-[#3EE07F]/50 text-[#3EE07F]",
  "Scientific Report": "border-[#6B7A8F]/50 text-muted-foreground",
};

function formatDate(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

/** NCPOR library: treaty, policy, standards and field manuals. */
export default function Library() {
  const documents = useQuery(api.records.listDocuments, {});
  const categories = useQuery(api.records.listDocumentCategories, {});
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const rows = documents ?? [];
    const needle = query.trim().toLowerCase();
    return rows.filter((doc) => {
      if (category !== "All" && doc.category !== category) return false;
      if (!needle) return true;
      return (
        doc.title.toLowerCase().includes(needle) ||
        doc.summary.toLowerCase().includes(needle) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [category, documents, query]);

  const withStandard = (documents ?? []).filter((d) => d.npdcStandard).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="NCPOR Library"
          title="Polar reference library"
          description="Treaty instruments, Ministry of Earth Sciences policy, NPDC data standards, field manuals and scientific reports that govern station operations and data publication on this platform."
        >
          <Badge variant="outline" className="border-primary/40 text-primary">
            <BookOpen className="mr-1 size-3" />
            {documents?.length ?? 0} records
          </Badge>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Documents" value={documents?.length ?? 0} hint="published references" />
          <StatTile
            label="Categories"
            value={categories?.length ?? 0}
            hint="policy to scientific report"
          />
          <StatTile
            label="With NPDC standard"
            value={withStandard}
            hint="documents carrying a submission standard"
            tone="text-[#FFB020]"
          />
          <StatTile
            label="Library standard"
            value="NPDC-DS"
            hint="national polar data centre series"
            tone="text-[#00E0C6]"
          />
        </div>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Search className="size-4 text-primary" />
              Browse references
            </span>
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, summary or tag"
                className="h-8 w-60 rounded border border-border bg-background px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
              >
                <option value="All">All categories</option>
                {(categories ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {documents === undefined ? (
            <PanelLoading height={300} />
          ) : filtered.length === 0 ? (
            <PanelEmpty message="No documents match this filter." height={200} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((doc) => (
                <div
                  key={doc._id}
                  className="flex flex-col gap-2 rounded border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-sm font-bold leading-snug text-foreground">
                      {doc.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[10px] uppercase",
                        CATEGORY_TONE[doc.category] ?? "border-border text-muted-foreground",
                      )}
                    >
                      {doc.category}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{doc.summary}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="cc-mono rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2">
                    <div className="flex items-center gap-2">
                      {doc.npdcStandard && (
                        <Badge
                          variant="outline"
                          className="border-[#FFB020]/50 text-[10px] text-[#FFB020]"
                        >
                          <Hash className="mr-1 size-3" />
                          {doc.npdcStandard}
                        </Badge>
                      )}
                      <span className="cc-mono text-[10px] text-muted-foreground">
                        {formatDate(doc.publishedAt)}
                      </span>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      Open source
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
