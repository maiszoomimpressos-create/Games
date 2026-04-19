export type HealthResponse = {
  status: string;
  service: string;
};

export type GameItem = {
  id: string;
  name: string;
  phase: string;
  description: string;
};

export type SupabaseHealthResponse =
  | {
      configured: true;
      ok: true;
      status: number;
      message: string;
    }
  | {
      configured: boolean;
      ok: false;
      status?: number;
      message: string;
    };

export async function fetchHealth(): Promise<HealthResponse> {
  const r = await fetch("/health");
  if (!r.ok) throw new Error("Falha ao consultar saúde da API");
  return r.json() as Promise<HealthResponse>;
}

export async function fetchGames(): Promise<{ items: GameItem[] }> {
  const r = await fetch("/api/games");
  if (!r.ok) throw new Error("Falha ao listar jogos");
  return r.json() as Promise<{ items: GameItem[] }>;
}

export async function fetchSupabaseHealth(): Promise<SupabaseHealthResponse> {
  const r = await fetch("/health/supabase");
  let body: unknown;
  try {
    body = await r.json();
  } catch {
    return { configured: false, ok: false, message: "Resposta inválida ao verificar Supabase." };
  }
  return body as SupabaseHealthResponse;
}
