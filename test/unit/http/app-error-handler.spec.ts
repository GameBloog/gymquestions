import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../src/app"
import { UserRole } from "../../../src/domain/entities/user"
import { JwtHelper } from "../../../src/infraestructure/security/jwt"

describe("App error handler", () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it("should return a client error for exercise media requests that are not multipart", async () => {
    const token = JwtHelper.generate({
      userId: "professor-id",
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
