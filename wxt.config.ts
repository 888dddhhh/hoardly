import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(dirname, "src"),
      },
    },
  }),
  manifest: {
    name: "Hoardly",
    description: "AI-powered bookmark management for Chrome.",
    permissions: ["bookmarks", "storage", "alarms", "identity", "tabs", "scripting"],
    host_permissions: ["https://*/*", "http://*/*"],
    /** 允许部署的 H5 预览站通过扩展 ID 拉取真实书签（网页侧 chrome.runtime.sendMessage） */
    externally_connectable: {
      matches: [
        "https://*.hoardly-demo.app/*",
        "http://127.0.0.1:*/*",
        "http://localhost:*/*",
      ],
    },
    action: {
      default_title: "Hoardly",
    },
  },
});
