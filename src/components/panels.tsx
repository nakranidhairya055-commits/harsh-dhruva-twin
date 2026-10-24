import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Screen heading used by every command-centre page. */
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="cc-label">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Compact numeric tile. */
export function StatTile({
  label,
  value,
  unit,
  hint,
  tone = "text-foreground",
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="pb-1">
        <span className="cc-label">{label}</span>
      </CardHeader>
      <CardContent>
        <div className={cn("cc-mono text-2xl leading-none", tone)}>
          {value}
          {unit && (
            <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>
          )}
        </div>
        {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Titled panel with an optional header action. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("cc-panel border-border shadow-none", className)}>
      <CardHeader className={cn("flex flex-row items-center justify-between gap-2 space-y-0 pb-2")}>
        <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className={bodyClassName}>{children}</CardContent>
    </Card>
  );
}

/** Centred spinner used while a query resolves. */
export function PanelLoading({ height = 160 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Muted empty state. */
export function PanelEmpty({ message, height = 160 }: { message: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center px-6 text-center text-sm text-muted-foreground"
      style={{ height }}
    >
      {message}
    </div>
  );
}
