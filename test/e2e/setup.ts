import { beforeAll, afterAll } from "vitest"
import { app } from "../../src/app"
import { prisma } from "../../src/infraestructure/database/prisma"

beforeAll(async () => {
  await app.ready()

  await prisma.$executeRawUnsafe("DROP SCHEMA public CASCADE")
  await prisma.$executeRawUnsafe("CREATE SCHEMA public")

})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})
