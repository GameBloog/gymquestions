import { describe, expect, it } from "vitest"
import { hasPdfSignature } from "../../../src/shared/utils/file-signature"

describe("hasPdfSignature", () => {
  it("should return true for a valid PDF signature", () => {
    const buffer = Buffer.from("%PDF-1.7\nresto do arquivo")

    expect(hasPdfSignature(buffer)).toBe(true)
  })

  it("should return false for a non-PDF buffer", () => {
    const buffer = Buffer.from("not-a-pdf")

    expect(hasPdfSignature(buffer)).toBe(false)
  })

  it("should return false for buffers shorter than the signature", () => {
    const buffer = Buffer.from("%PD")

    expect(hasPdfSignature(buffer)).toBe(false)
  })
})
