import type { Session } from "@supabase/supabase-js";
import { ADMIN_EMAIL } from "../appConfig";

function normEmail(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function isAdminSession(session: Session | null): boolean {
  if (!session?.user?.email) return false;
  return normEmail(session.user.email) === normEmail(ADMIN_EMAIL);
}
