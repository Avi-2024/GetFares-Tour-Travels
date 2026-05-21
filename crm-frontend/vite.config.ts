import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const standalone =
    env.VITE_STANDALONE === "true" || env.VITE_STANDALONE === "1";

  const apiTarget =
    env.VITE_API_PROXY_TARGET ||
    env.VITE_API_BASE_URL ||
    "http://localhost:3000";

  const apiProxy = standalone
    ? undefined
    : {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      };

  return {
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    server: {
      ...(apiProxy ? { proxy: apiProxy } : {}),
    },
    preview: {
      ...(apiProxy ? { proxy: apiProxy } : {}),
    },
  };
});
