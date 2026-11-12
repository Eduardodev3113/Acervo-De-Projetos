import react from "@vitejs/plugin-react"

import tailwindcss from "@tailwindcss/vite"

import { defineConfig } from "vite"

import { fileURLToPath } from "node:url"

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  server: {
    host: "0.0.0.0",

    port: Number(process.env.PORT) || 8443,

    strictPort: true,

    proxy: {
      "/api": {
        target:
          process.env.API_PROXY_TARGET ||
          `http://127.0.0.1:${Number(process.env.API_PORT) || 8787}`,

        changeOrigin: true,

        configure: (proxy) => {
          proxy.on("proxyReq", (proxyRequest) => {
            proxyRequest.removeHeader("origin")
          })
        },
      },
    },
  },

  preview: {
    host: "0.0.0.0",

    port: Number(process.env.PORT) || 8443,
  },
})
