import("./scripts/start.mjs").catch((error) => {
  console.error("Falha ao iniciar a aplicação:", error)
  process.exitCode = 1
})
