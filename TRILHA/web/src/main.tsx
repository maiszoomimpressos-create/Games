import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP_BRAND_NAME } from "./appConfig";
import { App } from "./App";
import "./styles.css";

document.title = `${APP_BRAND_NAME} — Jogos online`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
