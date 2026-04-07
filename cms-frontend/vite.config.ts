import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.BACKEND_URL || "http://localhost:3000";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.BACKEND_URL": JSON.stringify(backendUrl),
    },
  };
});
