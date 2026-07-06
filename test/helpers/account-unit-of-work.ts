import { UserRepository } from "../../src/application/repositories/user-repository"
import {
  AccountTransactionContext,
  AccountUnitOfWork,
} from "../../src/application/repositories/account-unit-of-work"

type TestAccountTransactionContext = Omit<
  Partial<AccountTransactionContext>,
  "userRepository"
> & {
  userRepository?: UserRepository
}

export function createTestAccountUnitOfWork(
  context: TestAccountTransactionContext,
): AccountUnitOfWork {
  const transactionalUserRepository = context.userRepository
    ? {
        create: (data) => context.userRepository!.create(data),
        findByEmail: (email) => context.userRepository!.findByEmail(email),
        findById: (id) => context.userRepository!.findById(id),
        update: (id, data) => context.userRepository!.update(id, data),
        block: (id, blockedAt) =>
          context.userRepository!.block(id, blockedAt),
        delete: (id) => context.userRepository!.delete(id),
        createPrepared: ({ passwordHash, ...data }) =>
          context.userRepository!.create({ ...data, password: passwordHash }),
        updatePrepared: (id, { passwordHash, ...data }) =>
          context.userRepository!.update(id, {
            ...data,
            ...(passwordHash && { password: passwordHash }),
          }),
      }
    : undefined

  return {
    preparePassword: async (password: string): Promise<string> => password,
    execute: async <T>(
      operation: (transaction: AccountTransactionContext) => Promise<T>,
    ): Promise<T> =>
      operation({
        recordRegistrationPrivacy: async () => undefined,
        ...context,
        ...(transactionalUserRepository && {
          userRepository: transactionalUserRepository,
        }),
      } as AccountTransactionContext),
  }
}
