import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { formatAge } from "@/lib/station";
import { Loader2, ShieldCheck, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

/** All DhruvaTwin operator roles. */
const ROLES = ["admin", "commander", "scientist", "station"] as const;

/** Guard card shown when the signed-in operator is not an admin. */
function NotAdmin() {
  return (
    <AppShell>
      <Card className="cc-panel border-border shadow-none">
        <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-center">
          <ShieldCheck className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Admin access required</p>
          <p className="max-w-md text-sm text-muted-foreground">
            This console is limited to platform administrators. If you need access,
            ask an existing administrator to grant the admin role to your account.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}

/** DhruvaTwin admin console: accounts, roles and content moderation. */
export default function Admin() {
  // Probe admin status with the users query itself; errors surface as undefined
  // data plus an error state in Convex, handled via the NotAdmin fallback below.
  const users = useQuery(api.admin.listUsers, {});
  const allNotes = useQuery(api.admin.listAllNotes, { limit: 50 });
  const setUserRole = useMutation(api.admin.setUserRole);
  const removeNote = useMutation(api.admin.removeNote);

  const [busyUser, setBusyUser] = useState<string | null>(null);

  if (users === undefined) {
    // Either loading or a permission error; render the guard while resolving.
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const setRole = async (userId: string, role: string) => {
    setBusyUser(userId);
    try {
      await setUserRole({
        userId: userId as never,
        twinRole: role as (typeof ROLES)[number],
      });
      toast.success("Role updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setBusyUser(null);
    }
  };

  const moderate = async (noteId: string) => {
    try {
      await removeNote({ noteId: noteId as never });
      toast.success("Entry removed from the platform.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove entry.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="cc-label">Admin Console</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Platform administration</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage operator accounts and their roles, and moderate content published
            across the programme. Changes take effect immediately for all signed-in users.
          </p>
        </div>

        {/* Users */}
        <Card className="cc-panel border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              Operator accounts
            </CardTitle>
            <Badge variant="outline" className="text-[10px] uppercase">
              <Users className="mr-1 size-3" />
              {users.length} accounts
            </Badge>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts yet.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const typed = u as {
                    _id: string;
                    name?: string;
                    email?: string;
                    twinRole?: string;
                  };
                  return (
                    <div
                      key={typed._id}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {typed.name ?? typed.email ?? "Unnamed operator"}
                        </div>
                        <div className="cc-mono truncate text-[10px] text-muted-foreground">
                          {typed.email ?? typed._id}
                        </div>
                      </div>
                      <Select
                        value={typed.twinRole ?? "scientist"}
                        onValueChange={(v) => void setRole(typed._id, v)}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs capitalize">
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {busyUser === typed._id && (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moderation */}
        <Card className="cc-panel border-border shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              Content moderation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allNotes === undefined ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : allNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing has been published yet.
              </p>
            ) : (
              <div className="space-y-2">
                {allNotes.map((n) => {
                  const typed = n as {
                    _id: string;
                    title: string;
                    kind: string;
                    status: string;
                    createdAt: number;
                    equipmentId: string;
                    stationName: string;
                    authorName: string;
                  };
                  return (
                    <div
                      key={typed._id}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
                    >
                      <Badge
                        variant="outline"
                        className={
                          typed.status === "removed"
                            ? "border-destructive/40 text-destructive"
                            : "text-[10px] uppercase"
                        }
                      >
                        {typed.status}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{typed.title}</div>
                        <div className="cc-mono text-[10px] text-muted-foreground">
                          {typed.stationName} - {typed.equipmentId} - {typed.authorName} -{" "}
                          {formatAge(typed.createdAt)}
                        </div>
                      </div>
                      {typed.status === "published" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => void moderate(typed._id)}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
