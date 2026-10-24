import { useCallback, useEffect, useMemo, useState } from "react";
import { roleView, toRoleView, type RoleView, type RoleViewDef } from "@/lib/roles";

const STORAGE_KEY = "dhruvatwin.roleView";

function readStored(fallback: RoleView): RoleView {
  if (typeof window === "undefined") return fallback;
  try {
    return toRoleView(window.localStorage.getItem(STORAGE_KEY), fallback);
  } catch {
    return fallback;
  }
}

export interface RoleViewState {
  role: RoleView;
  def: RoleViewDef;
  setRole: (role: RoleView) => void;
  allows: (path: string) => boolean;
}

/**
 * Track the active role view. When the operator has an explicit role on their
 * profile it becomes the default; the switch is then persisted locally so the
 * console opens in the same view next session.
 */
export function useRoleView(profileRole?: string | null): RoleViewState {
  const fallback = toRoleView(profileRole, "scientist");
  const [role, setRole] = useState<RoleView>(() => readStored(fallback));

  // Track the profile role: if the profile declares an explicit role, adopt it.
  useEffect(() => {
    setRole(readStored(fallback));
  }, [fallback]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, role);
    } catch {
      /* storage unavailable; the view still works for this session */
    }
  }, [role]);

  const def = useMemo(() => roleView(role), [role]);
  const allows = useCallback((path: string) => def.screens.includes(path), [def]);

  return { role, def, setRole, allows };
}
