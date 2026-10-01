import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    sourcemap: true,
    target: "es2022",
  },
  server: {
    strictPort: true,
  },
});
