import { describe, expect, it } from "vitest"
import {
  hasImageSignature,
  hasPdfSignature,
} from "../../../src/shared/utils/file-signature"

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

describe("hasImageSignature", () => {
  it("should return true for a JPEG signature", () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

    expect(hasImageSignature(buffer)).toBe(true)
  })

  it("should return true for a PNG signature", () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

    expect(hasImageSignature(buffer)).toBe(true)
  })

  it("should return true for a WEBP signature", () => {
    const buffer = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from("WEBP"),
    ])

    expect(hasImageSignature(buffer)).toBe(true)
  })

  it("should return false for a PDF buffer", () => {
    const buffer = Buffer.from("%PDF-1.7")

    expect(hasImageSignature(buffer)).toBe(false)
  })

  it("should return false for a RIFF container that is not WEBP", () => {
    const buffer = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from("WAVE"),
    ])

    expect(hasImageSignature(buffer)).toBe(false)
  })

  it("should return false for buffers shorter than any signature", () => {
    const buffer = Buffer.from([0xff])

    expect(hasImageSignature(buffer)).toBe(false)
  })
})
