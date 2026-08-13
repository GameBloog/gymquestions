import { describe, expect, it } from "vitest"
import { sign } from "jsonwebtoken"
import { UploadTokenHelper } from "../../../src/infraestructure/security/upload-token"
import { JwtHelper } from "../../../src/infraestructure/security/jwt"
import { UserRole } from "../../../src/domain/entities/user"
import { env } from "../../../src/env"

describe("UploadTokenHelper", () => {
  const payload = {
    exercicioId: "11111111-1111-1111-1111-111111111111",
    kind: "execucao" as const,
    publicId: "gym/exercicios/11111111-1111-1111-1111-111111111111/execucao/abc",
  }

  it("preserva o que foi assinado ao verificar", () => {
    const verified = UploadTokenHelper.verify(UploadTokenHelper.generate(payload))

    expect(verified).toMatchObject(payload)
  })

  it("recusa token adulterado", () => {
    const token = UploadTokenHelper.generate(payload)
    const adulterado = `${token.slice(0, -3)}xyz`

    expect(() => UploadTokenHelper.verify(adulterado)).toThrow()
  })

  it("recusa token assinado com outro segredo", () => {
    const forjado = sign(payload, "outro-segredo-qualquer-para-teste", {
      algorithm: "HS256",
      audience: "exercise-media-upload",
      expiresIn: 900,
    })

    expect(() => UploadTokenHelper.verify(forjado)).toThrow()
  })

  it("recusa token expirado", () => {
    const expirado = sign(payload, env.JWT_SECRET, {
      algorithm: "HS256",
      audience: "exercise-media-upload",
      expiresIn: -10,
    })

    expect(() => UploadTokenHelper.verify(expirado)).toThrow()
  })

  // As duas asserções abaixo são o motivo de a audiência existir. Os dois
  // tokens são assinados com JWT_SECRET; sem audiência distinta, um serviria
  // de credencial para o outro.
  it("não aceita um token de sessão como token de upload", () => {
    const sessao = JwtHelper.generate({
      userId: "user-1",
      email: "professor@test.com",
      role: UserRole.PROFESSOR,
    })

    expect(() => UploadTokenHelper.verify(sessao)).toThrow()
  })

  it("não deixa um token de upload passar por token de sessão", () => {
    const upload = UploadTokenHelper.generate(payload)

    // JwtHelper.verify não checa audiência, então precisa ao menos não
    // devolver identidade utilizável: sem userId, o middleware de auth não
    // encontra usuário e a requisição morre no 401.
    let identidade: { userId?: string } | null = null
    try {
      identidade = JwtHelper.verify(upload)
    } catch {
      identidade = null
    }

    expect(identidade?.userId).toBeUndefined()
  })
})
