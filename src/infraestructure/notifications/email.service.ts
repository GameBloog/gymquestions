import nodemailer, { type Transporter } from "nodemailer"
import { env } from "@/env"
import type { EmailSender, SendEmailInput } from "@/application/repositories/email-sender"

export class EmailService implements EmailSender {
  private transporter: Transporter | null
  private warnedNotConfigured = false

  constructor() {
    this.transporter = this.createTransporter()
  }

  private createTransporter(): Transporter | null {
    if (!this.isConfigured()) {
      return null
    }

    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  }

  private isConfigured(): boolean {
    return Boolean(
      env.SMTP_HOST &&
        env.SMTP_USER &&
        env.SMTP_PASS &&
        env.SMTP_FROM_EMAIL,
    )
  }

  async send(input: SendEmailInput): Promise<boolean> {
    if (!this.transporter) {
      if (!this.warnedNotConfigured) {
        console.warn(
          "[notifications] SMTP não configurado. Emails serão ignorados.",
        )
        this.warnedNotConfigured = true
      }
      return false
    }

    try {
      await this.transporter.sendMail({
        from: `\"${env.SMTP_FROM_NAME}\" <${env.SMTP_FROM_EMAIL}>`,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      })

      return true
    } catch (error) {
      console.error("[notifications] Falha ao enviar email:", error)
      return false
    }
  }
}

export const emailService = new EmailService()
