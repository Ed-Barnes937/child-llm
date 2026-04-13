import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { serverMiddleware } from "./src/lib/auth-middleware";

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    serverMiddleware(),
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
});
