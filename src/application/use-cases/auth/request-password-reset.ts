import type { EmailSender } from "@/application/repositories/email-sender"
import type { PasswordResetTokenRepository } from "@/application/repositories/password-reset-token-repository"
import type { UserRepository } from "@/application/repositories/user-repository"
import {
  generatePasswordResetToken,
  getPasswordResetExpiresAt,
  hashPasswordResetToken,
} from "@/infraestructure/security/password-reset-token"

interface RequestPasswordResetInput {
  email: string
  frontendOrigin: string
  expiresInMinutes: number
}

export class RequestPasswordResetUseCase {
  constructor(
    private userRepository: UserRepository,
    private passwordResetTokenRepository: PasswordResetTokenRepository,
    private emailSender: EmailSender,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const email = input.email.trim().toLowerCase()
    const user = await this.userRepository.findByEmail(email)

    if (!user || user.blockedAt || user.anonymizedAt) {
      return
    }

    const rawToken = generatePasswordResetToken()
    const token = await this.passwordResetTokenRepository.replaceActiveToken({
      userId: user.id,
      tokenHash: hashPasswordResetToken(rawToken),
      expiresAt: getPasswordResetExpiresAt(input.expiresInMinutes),
    })
    const resetUrl = this.buildResetUrl(input.frontendOrigin, rawToken)
    const expirationLabel = `${input.expiresInMinutes} minutos`

    const sent = await this.emailSender.send({
      to: user.email,
      subject: "Redefinição de senha - G-Force Coach",
      text: [
        "Recebemos uma solicitação para redefinir sua senha no G-Force Coach.",
        "",
        `Acesse o link abaixo em até ${expirationLabel}:`,
        resetUrl,
        "",
        "O link é de uso único. Se você não solicitou a alteração, ignore este email.",
      ].join("\n"),
      html: [
        "<p>Recebemos uma solicitação para redefinir sua senha no G-Force Coach.</p>",
        `<p><a href="${resetUrl}">Redefinir minha senha</a></p>`,
        `<p>Este link expira em ${expirationLabel} e pode ser usado apenas uma vez.</p>`,
        "<p>Se você não solicitou a alteração, ignore este email.</p>",
      ].join(""),
    })

    if (!sent) {
      await this.passwordResetTokenRepository.deleteById(token.id)
    }
  }

  private buildResetUrl(frontendOrigin: string, token: string): string {
    const resetUrl = new URL("/login", frontendOrigin)
    resetUrl.hash = new URLSearchParams({ resetToken: token }).toString()
    return resetUrl.toString()
  }
}
