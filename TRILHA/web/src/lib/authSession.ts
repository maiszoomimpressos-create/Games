import type { Session } from "@supabase/supabase-js";

/** Sessão com identidade confirmada: e-mail/SMS ou fornecedor OAuth já validado pelo Supabase. */
export function isConfirmedAuthSession(session: Session | null): boolean {
  if (!session?.user) return false;
  const u = session.user;
  if (u.email_confirmed_at || u.phone_confirmed_at) return true;
  const oauth = u.identities?.some((i) => i.provider && i.provider !== "email");
  return Boolean(oauth);
}
