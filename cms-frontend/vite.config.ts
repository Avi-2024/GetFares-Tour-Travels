import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl =
    env.VITE_API_BASE_URL ||
    env.VITE_BASE_API_URL ||
    env.BACKEND_URL ||
    (mode === "development" ? "http://localhost:3000" : "");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.BACKEND_URL": JSON.stringify(backendUrl),
    },
  };
});
