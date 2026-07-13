import { describe, expect, it } from "vitest"
import { LegalDocumentType } from "@prisma/client"
import { registerSchema, resetPasswordSchema } from "../../../src/infraestructure/http/validators/auth-validator"
import { createAlunoSchema, updateAlunoSchema } from "../../../src/infraestructure/http/validators/aluno-validator"
import { createProfessorSchema, updateProfessorSchema } from "../../../src/infraestructure/http/validators/professor-validator"
import { PASSWORD_MIN_LENGTH } from "../../../src/infraestructure/http/validators/password-validator"

const tooShortPassword = "123456789"
const validPassword = "1234567890"

const acceptedDocuments = [
  { documentType: LegalDocumentType.PRIVACY_POLICY, version: "2026-07" },
  { documentType: LegalDocumentType.TERMS_OF_USE, version: "2026-07" },
]

describe("password policy validators", () => {
  it("uses the same minimum length for public and admin-created accounts", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10)

    const payloads = [
      registerSchema.safeParse({
        nome: "Usuario Publico",
        email: "publico@test.com",
        password: tooShortPassword,
        acceptedDocuments,
      }),
      createAlunoSchema.safeParse({
        nome: "Aluno Admin",
        email: "aluno@test.com",
        password: tooShortPassword,
      }),
      updateAlunoSchema.safeParse({ password: tooShortPassword }),
      createProfessorSchema.safeParse({
        nome: "Professor Admin",
        email: "professor@test.com",
        password: tooShortPassword,
      }),
      updateProfessorSchema.safeParse({ password: tooShortPassword }),
      resetPasswordSchema.safeParse({
        token: "a".repeat(32),
        newPassword: tooShortPassword,
      }),
    ]

    expect(payloads.every((result) => !result.success)).toBe(true)
  })

  it("accepts passwords with the configured minimum length", () => {
    expect(createAlunoSchema.safeParse({
      nome: "Aluno Admin",
      email: "aluno@test.com",
      password: validPassword,
    }).success).toBe(true)

    expect(createProfessorSchema.safeParse({
      nome: "Professor Admin",
      email: "professor@test.com",
      password: validPassword,
    }).success).toBe(true)
  })
})
