import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiTarget = "http://localhost:3001";

export default defineConfig({
  envDir: path.resolve(__dirname, ".."),
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": apiTarget,
      "/health": apiTarget,
    },
  },
});
