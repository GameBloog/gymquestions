import { describe, it, expect } from "vitest"
import {
  createHistoricoSchema,
  updateHistoricoSchema,
} from "../../../src/infraestructure/http/validators/aluno-history-validator"

const alunoId = "00000000-0000-4000-8000-000000000001"

describe("aluno history validators", () => {
  it("should accept one-decimal waist, hip, and neck measurements", () => {
    const parsed = createHistoricoSchema.parse({
      alunoId: "f0a0f0e8-8a58-4b3a-9d18-2d75c687c58d",
      cinturaCm: 82.5,
      quadrilCm: 101.5,
      pescocoCm: 38.5,
    })

    expect(parsed.cinturaCm).toBe(82.5)
    expect(parsed.quadrilCm).toBe(101.5)
    expect(parsed.pescocoCm).toBe(38.5)
  })

  it("should reject unsupported measurement precision", () => {
    expect(() =>
      createHistoricoSchema.parse({
        alunoId: "f0a0f0e8-8a58-4b3a-9d18-2d75c687c58d",
        cinturaCm: 82.55,
      })
    ).toThrow()
  })

  it("should accept the canonical pernaDireitaCm field on update", () => {
    const parsed = updateHistoricoSchema.parse({
      pernaDireitaCm: 58.5,
    })

    expect(parsed.pernaDireitaCm).toBe(58.5)
  })

  it("accepts the canonical lean mass field", () => {
    const parsed = createHistoricoSchema.parse({
      alunoId,
      massaMagraKg: 68.4,
    })

    expect(parsed.massaMagraKg).toBe(68.4)
    expect(parsed).not.toHaveProperty("massaMuscularKg")
  })

  it("normalizes the legacy muscle mass field to lean mass", () => {
    const parsed = updateHistoricoSchema.parse({
      massaMuscularKg: 69.1,
    })

    expect(parsed.massaMagraKg).toBe(69.1)
    expect(parsed).not.toHaveProperty("massaMuscularKg")
  })

  it("rejects conflicting canonical and legacy lean mass values", () => {
    const result = createHistoricoSchema.safeParse({
      alunoId,
      massaMagraKg: 68.4,
      massaMuscularKg: 72.2,
    })

    expect(result.success).toBe(false)
  })

  it("rejects history without a measurement or observation", () => {
    const result = createHistoricoSchema.safeParse({ alunoId })

    expect(result.success).toBe(false)
  })

  it("does not count the record date as history content", () => {
    const result = createHistoricoSchema.safeParse({
      alunoId,
      dataRegistro: "2026-07-02T00:00:00.000Z",
    })

    expect(result.success).toBe(false)
  })

  it("rejects an observation containing only whitespace", () => {
    const result = createHistoricoSchema.safeParse({
      alunoId,
      observacoes: "   ",
    })

    expect(result.success).toBe(false)
  })

  it.each([
    { pesoKg: 80 },
    { percentualGordura: 15 },
    { observacoes: "Evolução observada" },
  ])("accepts valid history content: %o", (content) => {
    const result = createHistoricoSchema.safeParse({ alunoId, ...content })

    expect(result.success).toBe(true)
  })
})
