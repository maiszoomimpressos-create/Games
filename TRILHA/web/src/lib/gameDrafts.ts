import { supabase } from "../supabaseClient";

export type GameDraft = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  config: Record<string, unknown>;
  /** Preenchido quando o criador publica o jogo (snapshot visível para listagens futuras). */
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchMyDrafts(): Promise<{ drafts: GameDraft[]; error: string | null }> {
  if (!supabase) return { drafts: [], error: "Supabase não configurado." };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { drafts: [], error: "Sessão inválida." };

  const { data, error } = await supabase
    .from("game_drafts")
    .select("id, owner_id, title, description, config, published_at, created_at, updated_at")
    .eq("owner_id", session.user.id)
    .order("updated_at", { ascending: false });

  if (error) return { drafts: [], error: error.message };
  return { drafts: (data ?? []) as GameDraft[], error: null };
}

export async function createGameDraft(
  title: string,
  description: string | null,
  config?: Record<string, unknown>,
  publishedAt?: string | null,
): Promise<{ draft: GameDraft | null; error: string | null }> {
  if (!supabase) return { draft: null, error: "Supabase não configurado." };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { draft: null, error: "Precisas de estar autenticado." };

  const row = {
    owner_id: session.user.id,
    title: title.trim(),
    description: description?.trim() || null,
    ...(config && Object.keys(config).length > 0 ? { config } : {}),
    ...(publishedAt ? { published_at: publishedAt } : {}),
  };

  const { data, error } = await supabase.from("game_drafts").insert(row).select().single();

  if (error) return { draft: null, error: error.message };
  return { draft: data as GameDraft, error: null };
}

export async function updateGameDraft(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    config?: Record<string, unknown>;
    published_at?: string | null;
  },
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase não configurado." };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { error: "Sessão inválida." };

  const payload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("game_drafts").update(payload).eq("id", id).eq("owner_id", session.user.id);

  if (error) return { error: error.message };
  return { error: null };
}
