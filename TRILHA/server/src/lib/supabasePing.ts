/**
 * Confirma URL e chave *anon* via GoTrue (`/auth/v1/health`).
 * A raiz `/rest/v1/` pode exigir `service_role` em alguns projetos; a anon não serve para ping lá.
 */
export async function pingSupabaseRest(url: string, anonKey: string): Promise<{
  ok: boolean;
  status: number;
  detail?: string;
}> {
  const base = url.replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha de rede";
    return { ok: false, status: 0, detail: msg };
  }

  if (res.ok) return { ok: true, status: res.status };

  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, detail: text.slice(0, 200) || res.statusText };
}
