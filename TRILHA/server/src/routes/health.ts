import { Router } from "express";
import { pingSupabaseRest } from "../lib/supabasePing.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "trilha-api" });
});

healthRouter.get("/health/supabase", async (_req, res) => {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    res.status(503).json({
      configured: false,
      ok: false,
      message: "Defina SUPABASE_URL e SUPABASE_ANON_KEY no .env (veja .env.example).",
    });
    return;
  }

  const ping = await pingSupabaseRest(url, key);
  if (!ping.ok) {
    res.status(502).json({
      configured: true,
      ok: false,
      status: ping.status,
      message: ping.detail ?? "Não foi possível alcançar o Supabase.",
    });
    return;
  }

  res.json({
    configured: true,
    ok: true,
    status: ping.status,
    message: "Auth (GoTrue) respondeu; URL e chave anon parecem válidas.",
  });
});
