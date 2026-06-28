import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In dev, forward /api to the backend so the browser talks to one origin
      // (no CORS headaches, and the refresh cookie just works).
      "/api": "http://localhost:8080",
    },
  },
});
