import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "node:path";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" }
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
    cloudflare() // Manually placing the plugin so Wrangler stops hunting for it
  ],
  resolve: {
    alias: {
      "entities/lib/decode.js": path.resolve(process.cwd(), "node_modules/entities/lib/decode.js"),
      "entities/lib/encode.js": path.resolve(process.cwd(), "node_modules/entities/lib/encode.js"),
      entities: path.resolve(process.cwd(), "node_modules/entities")
    }
  }
});