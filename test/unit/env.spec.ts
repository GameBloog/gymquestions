import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const originalEnv = { ...process.env }

const baseProductionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@localhost:5432/gforce",
  JWT_SECRET:
    "production_secret_key_for_testing_purposes_with_64_characters_minimum",
  CLOUDINARY_CLOUD_NAME: "cloud",
  CLOUDINARY_API_KEY: "key",
  CLOUDINARY_API_SECRET: "secret",
  LEAD_TRACKING_SALT: "production-lead-tracking-salt",
  PRIVACY_CONTROLLER_NAME: "Controlador Teste",
  PRIVACY_CONTROLLER_ADDRESS: "Rua Teste, 123",
  PRIVACY_CONTACT_EMAIL: "privacidade@example.com",
}

const loadEnv = async (overrides: NodeJS.ProcessEnv = {}) => {
  vi.resetModules()
  process.env = {
    ...originalEnv,
    ...baseProductionEnv,
    PRIVACY_CONTROLLER_DOCUMENT_TYPE: undefined,
    PRIVACY_CONTROLLER_DOCUMENT: undefined,
    PRIVACY_CONTROLLER_CNPJ: undefined,
    ...overrides,
  }

  return import("../../src/env")
}

describe("env", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  it("accepts CPF as the privacy controller document in production", async () => {
    const { env } = await loadEnv({
      PRIVACY_CONTROLLER_DOCUMENT_TYPE: "CPF",
      PRIVACY_CONTROLLER_DOCUMENT: "123.456.789-01",
    })

    expect(env.PRIVACY_CONTROLLER_DOCUMENT_TYPE).toBe("CPF")
    expect(env.PRIVACY_CONTROLLER_DOCUMENT).toBe("123.456.789-01")
  })

  it("accepts CNPJ as the privacy controller document in production", async () => {
    const { env } = await loadEnv({
      PRIVACY_CONTROLLER_DOCUMENT_TYPE: "CNPJ",
      PRIVACY_CONTROLLER_DOCUMENT: "12.345.678/0001-90",
    })

    expect(env.PRIVACY_CONTROLLER_DOCUMENT_TYPE).toBe("CNPJ")
    expect(env.PRIVACY_CONTROLLER_DOCUMENT).toBe("12.345.678/0001-90")
  })

  it("parses textual boolean flags without truthy string coercion", async () => {
    const { env } = await loadEnv({
      PRIVACY_CONTROLLER_DOCUMENT_TYPE: "CPF",
      PRIVACY_CONTROLLER_DOCUMENT: "123.456.789-01",
      TRUST_PROXY: "false",
      ENABLE_NOTIFICATION_SCHEDULER: "false",
      SMTP_SECURE: "true",
    })

    expect(env.TRUST_PROXY).toBe(false)
    expect(env.ENABLE_NOTIFICATION_SCHEDULER).toBe(false)
    expect(env.SMTP_SECURE).toBe(true)
  })

  it("keeps legacy PRIVACY_CONTROLLER_CNPJ as a production fallback", async () => {
    const { env } = await loadEnv({
      PRIVACY_CONTROLLER_CNPJ: "12.345.678/0001-90",
    })

    expect(env.PRIVACY_CONTROLLER_CNPJ).toBe("12.345.678/0001-90")
  })

  it("rejects CPF with an invalid document format", async () => {
    await expect(
      loadEnv({
        PRIVACY_CONTROLLER_DOCUMENT_TYPE: "CPF",
        PRIVACY_CONTROLLER_DOCUMENT: "12.345.678/0001-90",
      })
    ).rejects.toThrow("Variáveis de ambiente inválidas")
  })

  it("rejects missing privacy controller document in production", async () => {
    await expect(loadEnv()).rejects.toThrow(
      "configuração do controlador LGPD ausente"
    )
  })
})
