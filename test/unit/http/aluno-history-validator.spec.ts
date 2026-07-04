import { describe, it, expect } from "vitest"
import {
  createHistoricoSchema,
  updateHistoricoSchema,
} from "../../../src/infraestructure/http/validators/aluno-history-validator"

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
})
