import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { BrandWordmark, IdentityTable } from "@/components/landing/AntarcticPoster";
import { PenguinWaddle } from "@/components/landing/PenguinSvg";
import { Badge } from "@/components/ui/badge";
import { PROJECT_IDENTITY } from "@/lib/station";
import { cn } from "@/lib/utils";

/** One numbered section of a legal document. */
export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

const PAGES = [
  { id: "terms", label: "Terms and Conditions", to: "/terms", icon: FileText },
  { id: "privacy", label: "Privacy Policy", to: "/privacy", icon: ShieldCheck },
] as const;

/**
 * Public document frame used by both legal pages.
 *
 * The documents carry the same identity as the rest of the product: the poster
 * band at the top with the wordmark and the programme chips, the same aurora
 * treatment, and the penguins keeping the tone human, because a legal page that
 * nobody reads protects nobody. Below it, a sticky table of contents on the
 * left and the document on the right.
 */
export function LegalShell({
  current,
  title,
  lede,
  updated,
  sections,
}: {
  current: (typeof PAGES)[number]["id"];
  title: string;
  lede: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <BrandWordmark className="text-base" />
          </Link>
          <span className="cc-label hidden sm:inline">Team {PROJECT_IDENTITY.team}</span>
          <nav className="ml-auto flex items-center gap-1">
            {PAGES.map((page) => {
              const Icon = page.icon;
              return (
                <Link
                  key={page.id}
                  to={page.to}
                  className={cn(
                    "flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] transition-colors",
                    current === page.id
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <Icon className="size-3" />
                  {page.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Poster band */}
      <div className="relative overflow-hidden border-b border-border bg-[#050A12]">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 90% at 12% -10%, rgba(0,224,198,0.16) 0%, transparent 58%), radial-gradient(90% 80% at 88% 0%, rgba(74,158,255,0.16) 0%, transparent 60%), radial-gradient(70% 60% at 50% 120%, rgba(62,224,127,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[#F58220]/50 text-[#F58220]">
              Team {PROJECT_IDENTITY.team}
            </Badge>
            <Badge variant="outline" className="border-primary/40 text-primary">
              PS {PROJECT_IDENTITY.psId}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {PROJECT_IDENTITY.event}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              Theme: {PROJECT_IDENTITY.theme}
            </Badge>
          </div>

          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <BrandWordmark className="block text-4xl sm:text-5xl" />
              <div className="cc-label mt-4 text-[10px]">Legal document</div>
              <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{lede}</p>
              <p className="cc-mono mt-3 text-[11px] text-muted-foreground">
                Last updated {updated} - {sections.length} sections
              </p>
            </div>

            <div className="hidden lg:block">
              <IdentityTable />
            </div>
          </div>

          {/* Penguins keeping the tone human, the way the twin keeps them on the ice */}
          <div className="pointer-events-none absolute -bottom-1 right-4 hidden opacity-95 xl:block">
            <PenguinWaddle
              kinds={["adelie", "gentoo"]}
              chicks={1}
              penguinClassName="h-20 w-auto"
              className="gap-1"
              bob={3}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="cc-panel rounded border border-border bg-card p-4">
              <div className="cc-label mb-2 text-[10px]">Contents</div>
              <ol className="space-y-1.5">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-[11px] leading-snug text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {index + 1}. {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-4 rounded border border-border bg-card p-4">
              <div className="cc-label mb-2 text-[10px]">The other document</div>
              {PAGES.filter((page) => page.id !== current).map((page) => (
                <Link
                  key={page.id}
                  to={page.to}
                  className="text-[11px] leading-snug text-primary transition-colors hover:underline"
                >
                  {page.label}
                </Link>
              ))}
              <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                These documents work together: the terms set the rules for use, the policy explains
                what happens to your data.
              </p>
            </div>
          </aside>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 border-l-2 border-primary/40 pl-4"
              >
                <h2 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
                  {index + 1}. {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="mt-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-1.5">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet.slice(0, 48)}
                        className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                      >
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div className="rounded border border-border bg-card p-4">
              <div className="cc-label text-[10px]">Contact</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Questions about these documents go to Team {PROJECT_IDENTITY.team} through the
                workspace inside {PROJECT_IDENTITY.name}, or to {PROJECT_IDENTITY.agency} as the
                problem statement partner. We answer requests about access, correction and deletion
                of personal data through the same channel, within thirty days.
              </p>
              <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
                These documents are written carefully and in plain language, but they are not a
                substitute for legal advice, and nothing in them is legal advice to you.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <BrandWordmark className="text-sm" />
          <span>Team {PROJECT_IDENTITY.team}</span>
          <span>PS {PROJECT_IDENTITY.psId}</span>
          <span>{PROJECT_IDENTITY.event}</span>
          <span>{PROJECT_IDENTITY.agency}</span>
          <Link to="/" className="ml-auto transition-colors hover:text-foreground">
            Back to the console
          </Link>
        </div>
      </footer>
    </div>
  );
}
