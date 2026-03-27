import { CreateUserInput, UpdateUserInput, User } from "../../domain/entities/user"

export interface UserRepository {
  create(data: CreateUserInput): Promise<User>
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  update(id: string, data: UpdateUserInput): Promise<User>
  delete(id: string): Promise<void>
}
