import { Router } from "express";

export const gamesRouter = Router();

gamesRouter.get("/games", (_req, res) => {
  res.json({
    items: [
      {
        id: "trilha",
        name: "Trilha",
        phase: "em breve",
        description: "Studio com teste interno; partidas de teste com convite via Supabase (migração 004).",
      },
    ],
  });
});
