import { Award, Check, ChevronDown, Footprints, RotateCcw } from "lucide-react";
import {
  ACHIEVEMENTS,
  GROUP_LABEL,
  fieldLevel,
  levelProgress,
  resetFieldProgress,
  useFieldProgress,
  type AchievementGroup,
} from "@/lib/achievements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";

const GROUP_ORDER: AchievementGroup[] = ["explore", "wildlife", "operations", "resilience"];

/**
 * Field badge card.
 *
 * The twin's progression layer in one place: the level and experience bar at
 * the top, the distance walked under it, then every badge grouped by what it
 * takes to win it. Badges you have not won still show what they ask for, so
 * the list doubles as a short list of things to go and do.
 */
export function FieldBadge() {
  const progress = useFieldProgress();
  const [open, setOpen] = useState(false);
  const level = fieldLevel(progress.xp);
  const pct = Math.round(levelProgress(progress.xp) * 100);
  const won = ACHIEVEMENTS.filter((entry) => progress.unlocked[entry.id]).length;

  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Award className="size-4 text-primary" />
          <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
            Field badge
          </CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="border-[#00E0C6]/40 text-[10px] text-[#7DF3E4]">
            Level {level}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Hide badges" : "Show badges"}
            className="size-7"
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="cc-mono text-muted-foreground">{progress.xp} XP</span>
            <span className="cc-mono text-muted-foreground">
              {pct}% to level {level + 1}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.max(3, pct)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            [`${won}/${ACHIEVEMENTS.length}`, "badges"],
            [`${Math.round(progress.walked)} m`, "on foot"],
            [`${progress.rooms.length}`, "rooms"],
          ].map(([value, label]) => (
            <div key={label} className="rounded border border-border px-2 py-1.5 text-center">
              <div className="cc-mono text-[12px] font-semibold text-foreground">{value}</div>
              <div className="cc-label text-[9px]">{label}</div>
            </div>
          ))}
        </div>

        <div className={cn("space-y-3", !open && "hidden")}>
          {GROUP_ORDER.map((group) => (
            <div key={group}>
              <div className="cc-label mb-1.5 text-[9px]">{GROUP_LABEL[group]}</div>
              <ul className="space-y-1.5">
                {ACHIEVEMENTS.filter((entry) => entry.group === group).map((entry) => {
                  const held = Boolean(progress.unlocked[entry.id]);
                  return (
                    <li
                      key={entry.id}
                      className={cn(
                        "rounded border px-2.5 py-1.5 transition-colors",
                        held
                          ? "border-[#00E0C6]/40 bg-[#00E0C6]/5"
                          : "border-border opacity-70",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {held ? (
                          <Check className="size-3 shrink-0 text-[#7DF3E4]" />
                        ) : (
                          <Footprints className="size-3 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "text-[11px] font-semibold",
                            held ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {entry.title}
                        </span>
                        <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                          +{entry.xp}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                        {entry.detail}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {open && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[10px] text-muted-foreground"
            onClick={resetFieldProgress}
          >
            <RotateCcw className="mr-1.5 size-3" />
            Reset badge progress
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
