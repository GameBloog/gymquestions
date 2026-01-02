import { beforeAll, afterAll } from "vitest"
import { app } from "../../src/app"
import { prisma } from "../../src/infraestructure/database/prisma"

beforeAll(async () => {
  await app.ready()

  // Limpar banco de dados de teste
  await prisma.$executeRawUnsafe("DROP SCHEMA public CASCADE")
  await prisma.$executeRawUnsafe("CREATE SCHEMA public")

  // Executar migrations
  // Você pode usar execSync aqui se necessário
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})
