import { AlunoRepository } from "./aluno-repository"
import { InviteCodeRepository } from "./invite-code-repository"
import { ProfessorRepository } from "./professor-repository"
import { TransactionalUserRepository } from "./user-repository"
import {
  AcceptedDocumentInput,
  PrivacyPreferencesInput,
} from "../use-cases/privacy/privacy-service"

export interface RegistrationPrivacyInput {
  userId: string
  acceptedDocuments: AcceptedDocumentInput[]
  preferences: PrivacyPreferencesInput
  ip?: string
  userAgent?: string
}

export interface AccountTransactionContext {
  userRepository: TransactionalUserRepository
  inviteCodeRepository: InviteCodeRepository
  professorRepository: ProfessorRepository
  alunoRepository: AlunoRepository
  recordRegistrationPrivacy(
    input: RegistrationPrivacyInput,
  ): Promise<void>
}

export interface AccountUnitOfWork {
  preparePassword(password: string): Promise<string>
  execute<T>(
    operation: (context: AccountTransactionContext) => Promise<T>,
  ): Promise<T>
}
