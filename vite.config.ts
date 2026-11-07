import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000";

  return {
    plugins: [vue(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": backendTarget,
        "/health": backendTarget
      }
    },
    preview: {
      port: 5173,
      proxy: {
        "/api": backendTarget,
        "/health": backendTarget
      }
    }
  };
});
