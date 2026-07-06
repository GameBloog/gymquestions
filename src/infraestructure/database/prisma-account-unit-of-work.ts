import {
  AccountTransactionContext,
  AccountUnitOfWork,
  RegistrationPrivacyInput,
} from "@/application/repositories/account-unit-of-work"
import { privacyService } from "@/application/use-cases/privacy/privacy-service"
import { PasswordHelper } from "@/infraestructure/security/password"
import { prisma } from "./prisma"
import { PrismaAlunoRepository } from "./respositories/prisma-aluno-repository"
import { PrismaInviteCodeRepository } from "./respositories/prisma-invite-code-repository"
import { PrismaProfessorRepository } from "./respositories/prisma-professor-repository"
import { PrismaUserRepository } from "./respositories/prisma-user-repository"

export class PrismaAccountUnitOfWork implements AccountUnitOfWork {
  preparePassword(password: string): Promise<string> {
    return PasswordHelper.hash(password)
  }

  async execute<T>(
    operation: (context: AccountTransactionContext) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (transaction) => {
      const context: AccountTransactionContext = {
        userRepository: new PrismaUserRepository(transaction),
        inviteCodeRepository: new PrismaInviteCodeRepository(transaction),
        professorRepository: new PrismaProfessorRepository(transaction),
        alunoRepository: new PrismaAlunoRepository(transaction),
        recordRegistrationPrivacy: (
          input: RegistrationPrivacyInput,
        ): Promise<void> =>
          privacyService.recordRegistrationPrivacy(input, transaction),
      }

      return operation(context)
    })
  }
}
