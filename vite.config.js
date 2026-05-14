import { defineConfig } from "vite";
import { jdProxyPlugin } from "./vite-plugin-jd-proxy.js";

export default defineConfig({
  plugins: [jdProxyPlugin()],
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
