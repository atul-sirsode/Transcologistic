import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve";
  const isAnalyze = mode === "analyze";

  return {
    plugins: [
      react(),
      ...(isAnalyze
        ? [visualizer({ open: true, filename: "dist/stats.html" })]
        : []),
    ],
    root: path.resolve(__dirname),
    base: isDev ? "/" : "./", // important: dev uses absolute /, production uses relative
    server: {
      //port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:4000", // update if your dotnet runs at another url
          changeOrigin: true,
        },
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
            icons: ["lucide-react"],
            query: ["@tanstack/react-query", "@tanstack/react-table"],
            forms: ["react-hook-form", "@hookform/resolvers"],
            charts: ["recharts"],
            utils: ["lodash", "date-fns", "clsx", "tailwind-merge"],
            motion: ["framer-motion"],
            router: ["react-router-dom"],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
  };
});
