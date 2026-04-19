import "dotenv/config";
import cors from "cors";
import express from "express";
import { gamesRouter } from "./routes/games.js";
import { healthRouter } from "./routes/health.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use(healthRouter);
app.use("/api", gamesRouter);

app.listen(port, () => {
  console.log(`API TRILHA em http://localhost:${port}`);
});
