import { CreateUserInput, UpdateUserInput, User } from "../../domain/entities/user"

export interface PreparedCreateUserInput
  extends Omit<CreateUserInput, "password"> {
  passwordHash: string
}

export interface PreparedUpdateUserInput
  extends Omit<UpdateUserInput, "password"> {
  passwordHash?: string
}

export interface UserRepository {
  create(data: CreateUserInput): Promise<User>
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  update(id: string, data: UpdateUserInput): Promise<User>
  block(id: string, blockedAt?: Date): Promise<User>
  delete(id: string): Promise<void>
}

export interface TransactionalUserRepository extends UserRepository {
  createPrepared(data: PreparedCreateUserInput): Promise<User>
  updatePrepared(id: string, data: PreparedUpdateUserInput): Promise<User>
}
