import "dotenv/config"
import { app } from "./app"
import { env } from "./env"
import { prisma } from "./infraestructure/database/prisma"
import { cronScheduler } from "./infraestructure/jobs/cron-scheduler"

async function start() {
  try {

    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    })

    cronScheduler.start()

    console.log(`🚀 Servidor rodando em http://localhost:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

process.on("SIGINT", async () => {
  cronScheduler.stop()
  await prisma.$disconnect()
  await app.close()
  console.log("\n👋 Servidor encerrado (SIGINT)")
  process.exit(0)
})

process.on("SIGTERM", async () => {
  cronScheduler.stop()
  await prisma.$disconnect()
  await app.close()
  console.log("\n👋 Servidor encerrado (SIGTERM)")
  process.exit(0)
})

start()
