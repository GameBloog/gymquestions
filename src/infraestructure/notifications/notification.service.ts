import { NotificationTipo, Prisma, TipoArquivo } from "@prisma/client"
import { prisma } from "@/infraestructure/database/prisma"
import { emailService } from "./email.service"
import { whatsAppService } from "./whatsapp.service"

interface ArquivoProntoInput {
  alunoId: string
  tipo: TipoArquivo
  titulo: string
}

interface FotoEnviadaInput {
  alunoId: string
  descricao?: string
}

type AlunoComContato = Prisma.AlunoGetPayload<{
  include: {
    user: true
    professor: {
      include: {
        user: true
      }
    }
  }
}>

export class NotificationService {
  async notifyAlunoArquivoPronto(input: ArquivoProntoInput): Promise<void> {
    const aluno = await this.getAlunoComContato(input.alunoId)
    if (!aluno) return

    const tipoLabel = input.tipo === "TREINO" ? "treino" : "dieta"
    const subject = `Seu ${tipoLabel} está pronto`;
    const emailText = `Olá ${aluno.user.nome},\n\nSeu ${tipoLabel} \"${input.titulo}\" já está disponível na plataforma G-Force.\nAcesse sua conta para visualizar.\n\nG-Force`
    const whatsappText = `Olá, ${aluno.user.nome}! Seu ${tipoLabel} \"${input.titulo}\" já está pronto na plataforma G-Force. Acesse para visualizar.`

    await Promise.allSettled([
      this.sendEmailToAluno(aluno, subject, emailText),
      this.sendWhatsAppToAluno(aluno, whatsappText),
    ])
  }

  async notifyProfessorAlunoEnviouFotos(input: FotoEnviadaInput): Promise<void> {
    const aluno = await this.getAlunoComContato(input.alunoId)
    if (!aluno) return

    const subject = `Aluno enviou novas fotos: ${aluno.user.nome}`
    const descricaoText = input.descricao
      ? `\nDescrição da foto: ${input.descricao}`
      : ""

    const emailText = `Olá, ${aluno.professor?.user?.nome || "Professor"}.\n\nO aluno ${aluno.user.nome} enviou novas fotos de evolução.${descricaoText}\n\nAcesse a plataforma para revisar.\n\nG-Force`

    await this.sendEmailToProfessor(aluno, subject, emailText)
  }

  async notifyProfessorAlunoSalvouFormulario(alunoId: string): Promise<void> {
    const aluno = await this.getAlunoComContato(alunoId)
    if (!aluno) return

    const subject = `Aluno atualizou o formulário: ${aluno.user.nome}`
    const emailText = `Olá, ${aluno.professor?.user?.nome || "Professor"}.\n\nO aluno ${aluno.user.nome} preencheu e salvou o formulário de perfil.\n\nAcesse a plataforma para revisar os dados atualizados.\n\nG-Force`

    await this.sendEmailToProfessor(aluno, subject, emailText)
  }

  async sendFridayPhotoReminder(): Promise<void> {
    const alunos = await prisma.aluno.findMany({
      include: {
        user: true,
        professor: {
          include: {
            user: true,
          },
        },
      },
    })

    const today = this.toDateOnly(new Date())

    for (const aluno of alunos) {
      try {
        const shouldSend = await this.markDispatchOnce(
          aluno.id,
          NotificationTipo.FOTO_SEXTA_LEMBRETE,
          today,
        )

        if (!shouldSend) {
          continue
        }

        const subject = "Lembrete: envio de fotos da semana"
        const emailText = `Olá ${aluno.user.nome},\n\nSexta-feira é dia de atualizar suas fotos de evolução na plataforma G-Force.\nEsse envio é essencial para o acompanhamento do processo.\n\nG-Force`
        const whatsappText = `Olá, ${aluno.user.nome}! Sexta-feira é dia de enviar suas fotos de evolução na plataforma G-Force.`

        await Promise.allSettled([
          this.sendEmailToAluno(aluno, subject, emailText),
          this.sendWhatsAppToAluno(aluno, whatsappText),
        ])
      } catch (error) {
        console.error(
          `[notifications] Erro ao enviar lembrete de sexta para aluno ${aluno.id}:`,
          error,
        )
      }
    }
  }

  async sendReavaliacaoRemindersForToday(): Promise<void> {
    const alunos = await prisma.aluno.findMany({
      include: {
        user: true,
        professor: {
          include: {
            user: true,
          },
        },
        historico: {
          orderBy: {
            dataRegistro: "desc",
          },
          take: 1,
        },
      },
    })

    const today = this.toDateOnly(new Date())

    for (const aluno of alunos) {
      const latestHistorico = aluno.historico[0]
      if (!latestHistorico) {
        continue
      }

      const dataReavaliacao = this.addOneMonth(latestHistorico.dataRegistro)
      if (!this.isSameDate(dataReavaliacao, today)) {
        continue
      }

      try {
        const shouldSend = await this.markDispatchOnce(
          aluno.id,
          NotificationTipo.REAVALIACAO,
          today,
        )

        if (!shouldSend) {
          continue
        }

        const dataText = this.formatDate(today)
        const subjectAluno = "Hoje é dia da sua reavaliação"
        const textAluno = `Olá ${aluno.user.nome},\n\nHoje (${dataText}) é a data da sua reavaliação mensal.\nAcesse a plataforma e siga as orientações do seu acompanhamento.\n\nG-Force`
        const waTextAluno = `Olá, ${aluno.user.nome}! Hoje (${dataText}) é dia da sua reavaliação mensal na G-Force.`

        const subjectProfessor = `Reavaliação do aluno ${aluno.user.nome}`
        const textProfessor = `Olá, ${aluno.professor?.user?.nome || "Professor"}.\n\nHoje (${dataText}) é a data de reavaliação do aluno ${aluno.user.nome}.\n\nG-Force`

        await Promise.allSettled([
          this.sendEmailToAluno(aluno, subjectAluno, textAluno),
          this.sendWhatsAppToAluno(aluno, waTextAluno),
          this.sendEmailToProfessor(aluno, subjectProfessor, textProfessor),
        ])
      } catch (error) {
        console.error(
          `[notifications] Erro ao enviar lembrete de reavaliação para aluno ${aluno.id}:`,
          error,
        )
      }
    }
  }

  private async getAlunoComContato(alunoId: string): Promise<AlunoComContato | null> {
    return prisma.aluno.findUnique({
      where: { id: alunoId },
      include: {
        user: true,
        professor: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  private async sendEmailToAluno(
    aluno: AlunoComContato,
    subject: string,
    text: string,
  ): Promise<void> {
    if (!aluno.user?.email) {
      return
    }

    await emailService.send({
      to: aluno.user.email,
      subject,
      text,
    })
  }

  private async sendWhatsAppToAluno(
    aluno: Pick<AlunoComContato, "telefone" | "id">,
    message: string,
  ): Promise<void> {
    if (!aluno.telefone) {
      return
    }

    await whatsAppService.send({
      to: aluno.telefone,
      message,
    })
  }

  private async sendEmailToProfessor(
    aluno: AlunoComContato,
    subject: string,
    text: string,
  ): Promise<void> {
    const professorEmail = aluno.professor?.user?.email
    if (!professorEmail) {
      return
    }

    await emailService.send({
      to: professorEmail,
      subject,
      text,
    })
  }

  private toDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  private isSameDate(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  private addOneMonth(date: Date): Date {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    const tentative = new Date(year, month + 1, day)
    const expectedMonth = (month + 1) % 12

    if (tentative.getMonth() !== expectedMonth) {
      return new Date(year, month + 2, 0)
    }

    return tentative
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
  }

  private async markDispatchOnce(
    alunoId: string,
    tipo: NotificationTipo,
    referenceDate: Date,
  ): Promise<boolean> {
    try {
      await prisma.notificationDispatch.create({
        data: {
          alunoId,
          tipo,
          referenceDate: this.toDateOnly(referenceDate),
        },
      })

      return true
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return false
      }

      throw error
    }
  }
}

export const notificationService = new NotificationService()
