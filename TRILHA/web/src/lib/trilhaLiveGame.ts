import { supabase } from "../supabaseClient";
import type { TrilhaCaptureCounts, TrilhaPieceColor, TrilhaPhase } from "./trilhaPieces";

export type TrilhaLiveGameStatus = "waiting" | "active" | "finished";

/** Estado partilhado (alinhado ao Studio / regras locais). */
export type TrilhaLiveGameState = {
  v: 1;
  trilhaPieces: Partial<Record<string, TrilhaPieceColor>>;
  pieceTurn: TrilhaPieceColor;
  trilhaPhase: TrilhaPhase;
  pendingMillTriad: string[] | null;
  placementsMade: { yellow: number; blue: number };
  captureCounts: TrilhaCaptureCounts;
};

export type TrilhaLiveGameRow = {
  id: string;
  invite_code: string;
  host_id: string;
  guest_id: string | null;
  status: TrilhaLiveGameStatus;
  state: TrilhaLiveGameState;
  created_at: string;
  updated_at: string;
};

export function defaultTrilhaLiveState(): TrilhaLiveGameState {
  return {
    v: 1,
    trilhaPieces: {},
    pieceTurn: "yellow",
    trilhaPhase: "place",
    pendingMillTriad: null,
    placementsMade: { yellow: 0, blue: 0 },
    captureCounts: { fromYellow: 0, fromBlue: 0 },
  };
}

function randomInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const len = 6;
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[arr[i]! % chars.length]!;
  return s;
}

function normalizePhase(o: Partial<TrilhaLiveGameState>): TrilhaPhase {
  const ph = o.trilhaPhase;
  if (ph === "remove" || ph === "move") return ph;
  const y = Number(o.placementsMade?.yellow ?? 0);
  const b = Number(o.placementsMade?.blue ?? 0);
  if (y >= 9 && b >= 9) return "move";
  return "place";
}

function normalizeState(raw: unknown): TrilhaLiveGameState {
  const d = defaultTrilhaLiveState();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Partial<TrilhaLiveGameState>;
  const merged: TrilhaLiveGameState = {
    ...d,
    ...o,
    v: 1,
    placementsMade: {
      yellow: Math.max(0, Number(o.placementsMade?.yellow ?? d.placementsMade.yellow)),
      blue: Math.max(0, Number(o.placementsMade?.blue ?? d.placementsMade.blue)),
    },
    captureCounts: {
      fromYellow: Math.max(0, Number(o.captureCounts?.fromYellow ?? d.captureCounts.fromYellow)),
      fromBlue: Math.max(0, Number(o.captureCounts?.fromBlue ?? d.captureCounts.fromBlue)),
    },
  };
  merged.trilhaPhase = normalizePhase(merged);
  return merged;
}

function parseRow(data: Record<string, unknown>): TrilhaLiveGameRow | null {
  if (!data?.id || typeof data.id !== "string") return null;
  return {
    id: data.id as string,
    invite_code: String(data.invite_code ?? ""),
    host_id: String(data.host_id ?? ""),
    guest_id: data.guest_id == null ? null : String(data.guest_id),
    status: data.status as TrilhaLiveGameStatus,
    state: normalizeState(data.state),
    created_at: String(data.created_at ?? ""),
    updated_at: String(data.updated_at ?? ""),
  };
}

export async function createTrilhaLiveGame(): Promise<{
  game: TrilhaLiveGameRow | null;
  error: string | null;
}> {
  if (!supabase) return { game: null, error: "Supabase não configurado." };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { game: null, error: "Inicia sessão para criar uma partida de teste." };

  const st = defaultTrilhaLiveState();
  for (let attempt = 0; attempt < 12; attempt++) {
    const invite_code = randomInviteCode();
    const { data, error } = await supabase
      .from("trilha_live_games")
      .insert({
        invite_code,
        host_id: session.user.id,
        status: "waiting",
        state: st,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") continue;
      return { game: null, error: error.message };
    }
    const g = parseRow(data as Record<string, unknown>);
    if (!g) return { game: null, error: "Resposta inválida do servidor." };
    return { game: g, error: null };
  }
  return { game: null, error: "Não foi possível gerar código único. Tenta outra vez." };
}

export async function joinTrilhaLiveGameByCode(code: string): Promise<{
  game: TrilhaLiveGameRow | null;
  error: string | null;
}> {
  if (!supabase) return { game: null, error: "Supabase não configurado." };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { game: null, error: "Inicia sessão para entrar numa partida." };

  const { data, error } = await supabase.rpc("join_trilha_live_game", {
    p_code: code.trim(),
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("game_not_found")) return { game: null, error: "Código inválido ou partida já iniciada." };
    if (msg.includes("cannot_join_own_game")) return { game: null, error: "Não podes usar o teu próprio código." };
    if (msg.includes("invalid_code")) return { game: null, error: "Código inválido." };
    if (msg.includes("schema cache") || msg.includes("Could not find the function")) {
      return {
        game: null,
        error:
          "A RPC join_trilha_live_game não está visível no PostgREST. Executa no Supabase o SQL de supabase/migrations/005_trilha_join_rpc_jsonb.sql (ou a 004 completa) e espera ~1 minuto.",
      };
    }
    return { game: null, error: error.message };
  }
  const g = parseRow(data as Record<string, unknown>);
  if (!g) return { game: null, error: "Resposta inválida do servidor." };
  return { game: g, error: null };
}

/** Subscrição Realtime à linha da partida (dois clientes veem convites / estado). */
export function subscribeTrilhaLiveGame(
  gameId: string,
  onRow: (row: TrilhaLiveGameRow) => void,
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`trilha_live_games:${gameId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trilha_live_games", filter: `id=eq.${gameId}` },
      (payload) => {
        const raw = payload.new as Record<string, unknown> | undefined;
        if (!raw) return;
        const g = parseRow(raw);
        if (g) onRow(g);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function updateTrilhaLiveGameState(
  gameId: string,
  state: TrilhaLiveGameState,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase não configurado." };
  const { error } = await supabase.from("trilha_live_games").update({ state }).eq("id", gameId);
  if (error) return { error: error.message };
  return { error: null };
}
