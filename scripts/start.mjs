import { access } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

process.env.NODE_ENV = "production"

const root = resolve(fileURLToPath(new URL("../", import.meta.url)))

try {
  await access(resolve(root, "dist/index.html"))
} catch (error) {
  if (error.code === "ENOENT") {
    throw new Error("Build de produção ausente. Execute npm run build antes de iniciar o servidor.")
  }

  throw error
}

await import("../server/index.mjs")
