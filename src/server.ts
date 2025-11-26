import "dotenv/config"
import { app } from "./app"
import { env } from "./env"
import { prisma } from "./infraestructure/database/prisma"


// -------------------------------------------------------
// Start do servidor
// -------------------------------------------------------
async function start() {
  console.log(
    "DEBUG ENV RUN_SEED_ON_START =",
    JSON.stringify(process.env.RUN_SEED_ON_START)
  )

  try {

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
