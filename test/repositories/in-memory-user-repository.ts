import { UserRepository } from "../../src/application/repositories/user-repository"
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserRole,
} from "../../src/domain/entities/user"
import { randomUUID } from "crypto"
import { AppError } from "../../src/shared/errors/app-error"

export class InMemoryUserRepository implements UserRepository {
  public users: User[] = []

  async create(data: CreateUserInput): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email: data.email,
      password: data.password,
      nome: data.nome,
      role: data.role || UserRole.ALUNO,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.users.push(user)
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.users.find((u) => u.email === email)
    return user || null
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((u) => u.id === id)
    return user || null
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    const index = this.users.findIndex((user) => user.id === id)

    if (index === -1) {
      throw new AppError("Usuário não encontrado", 404)
    }

    const currentUser = this.users[index]
    const updatedUser: User = {
      ...currentUser,
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.password !== undefined && { password: data.password }),
      updatedAt: new Date(),
    }

    this.users[index] = updatedUser
    return updatedUser
  }

  async delete(id: string): Promise<void> {
    this.users = this.users.filter((user) => user.id !== id)
  }

  clear() {
    this.users = []
  }

  count(): number {
    return this.users.length
  }
}
