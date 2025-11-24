import "dotenv/config"
import { app } from "./app"
import { env } from "./env"
import { prisma } from "./infraestructure/database/prisma"

async function start() {
  try {
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

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect()
  await app.close()
  console.log("\n👋 Servidor encerrado")
  process.exit(0)
})

process.on("SIGTERM", async () => {
  await prisma.$disconnect()
  await app.close()
  process.exit(0)
})

start()
