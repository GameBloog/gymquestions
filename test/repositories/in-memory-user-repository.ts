import { UserRepository } from "../../src/application/repositories/user-repository"
import { User, CreateUserInput, UserRole } from "../../src/domain/entities/user"
import { randomUUID } from "crypto"

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

  clear() {
    this.users = []
  }

  count(): number {
    return this.users.length
  }
}
