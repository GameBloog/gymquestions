import "dotenv/config"
import { app } from "./app"
import { env } from "./env"
import { prisma } from "./infraestructure/database/prisma"
import { runSeed } from "./prisma/seed"

// -------------------------------------------------------
// Executa o seed somente quando a variável estiver habilitada
// -------------------------------------------------------
async function maybeRunSeed() {
  if (process.env.RUN_SEED_ON_START === "true") {
    console.log("🔄 RUN_SEED_ON_START = true → Executando seed...\n")

    try {
      await runSeed()
      console.log("🌱 Seed executado com sucesso!\n")
    } catch (error) {
      console.error("❌ Erro ao executar seed:", error)
      process.exit(1)
    }
  } else {
    console.log("⏭️ RUN_SEED_ON_START desabilitado → Seed não será executado.")
  }
}

// -------------------------------------------------------
// Start do servidor
// -------------------------------------------------------
async function start() {
  try {
    // Executa o seed (opcional)
    await maybeRunSeed()

    // Inicializa o servidor Fastify
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    })

    console.log(`🚀 Servidor rodando em http://localhost:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// -------------------------------------------------------
// Graceful shutdown
// -------------------------------------------------------
process.on("SIGINT", async () => {
  await prisma.$disconnect()
  await app.close()
  console.log("\n👋 Servidor encerrado (SIGINT)")
  process.exit(0)
})

process.on("SIGTERM", async () => {
  await prisma.$disconnect()
  await app.close()
  console.log("\n👋 Servidor encerrado (SIGTERM)")
  process.exit(0)
})

start()
