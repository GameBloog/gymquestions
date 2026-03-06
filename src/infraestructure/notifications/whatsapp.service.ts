import { env } from "@/env"

interface SendWhatsAppInput {
  to: string
  message: string
}

export class WhatsAppService {
  private warnedNotConfigured = false

  private isConfigured(): boolean {
    return Boolean(
      env.TWILIO_ACCOUNT_SID &&
        env.TWILIO_AUTH_TOKEN &&
        env.TWILIO_WHATSAPP_FROM,
    )
  }

  private normalizePhoneNumber(value: string | null | undefined): string | null {
    if (!value) return null

    const digits = value.replace(/\D/g, "")
    if (!digits) return null

    const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`
    return `+${withCountryCode}`
  }

  private normalizeFrom(value: string): string {
    const sanitized = value.replace("whatsapp:", "")
    const normalized = sanitized.startsWith("+")
      ? sanitized
      : `+${sanitized.replace(/\D/g, "")}`

    return `whatsapp:${normalized}`
  }

  async send(input: SendWhatsAppInput): Promise<boolean> {
    if (!this.isConfigured()) {
      if (!this.warnedNotConfigured) {
        console.warn(
          "[notifications] Twilio WhatsApp não configurado. Mensagens serão ignoradas.",
        )
        this.warnedNotConfigured = true
      }
      return false
    }

    const normalizedTo = this.normalizePhoneNumber(input.to)
    if (!normalizedTo) {
      console.warn("[notifications] Telefone inválido para WhatsApp:", input.to)
      return false
    }

    try {
      const accountSid = env.TWILIO_ACCOUNT_SID!
      const authToken = env.TWILIO_AUTH_TOKEN!
      const from = this.normalizeFrom(env.TWILIO_WHATSAPP_FROM!)

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      const body = new URLSearchParams({
        From: from,
        To: `whatsapp:${normalizedTo}`,
        Body: input.message,
      })

      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(
          `[notifications] Twilio retornou ${response.status}: ${text}`,
        )
      }

      return true
    } catch (error) {
      console.error("[notifications] Falha ao enviar WhatsApp:", error)
      return false
    }
  }
}

export const whatsAppService = new WhatsAppService()
