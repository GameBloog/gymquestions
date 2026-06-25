import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../src/app"
import { UserRole } from "../../../src/domain/entities/user"
import { JwtHelper } from "../../../src/infraestructure/security/jwt"
import { prismaTest } from "../../helpers/test-helpers"

describe("App error handler", () => {
  // SEC-001: o middleware exige usuário existente no banco (não forja mais
  // identidade a partir do token para usuário inexistente). Criamos um
  // professor real para exercitar o handler de erro de multipart.
  let professorUserId: string

  beforeAll(async () => {
    await app.ready()
    const user = await prismaTest.user.create({
      data: {
        nome: "Professor ErrorHandler",
        email: `professor-errorhandler-${Date.now()}@test.com`,
        password: "x",
        role: UserRole.PROFESSOR,
      },
    })
    professorUserId = user.id
  })

  afterAll(async () => {
    await prismaTest.user.delete({ where: { id: professorUserId } })
    await prismaTest.$disconnect()
    await app.close()
  })

  it("should return a client error for exercise media requests that are not multipart", async () => {
    const token = JwtHelper.generate({
      userId: professorUserId,
      email: "professor@test.com",
      role: UserRole.PROFESSOR,
    })

    const response = await app.inject({
      method: "POST",
      url: "/exercicios/00000000-0000-0000-0000-000000000000/midia/execucao",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      payload: {
        file: "not-a-file",
      },
    })

    expect(response.statusCode).toBe(406)
    expect(JSON.parse(response.body)).toEqual({
      error: "A requisição deve ser multipart/form-data",
    })
  })
})
