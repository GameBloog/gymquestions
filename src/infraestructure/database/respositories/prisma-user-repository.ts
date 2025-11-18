import { UserRepository } from "../../../application/repositories/user-repository"
import { User, CreateUserInput, UserRole } from "../../../domain/entities/user"
import { prisma } from "../prisma"
import { PasswordHelper } from "../../security/password"
import { UserMapper } from "../mapper/user-mapper"

export class PrismaUserRepository implements UserRepository {
  async create(data: CreateUserInput): Promise<User> {
    const hashedPassword = await PasswordHelper.hash(data.password)

    const created = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nome: data.nome,
        role: data.role ?? UserRole.ALUNO,
      },
    })

    return UserMapper.toDomain(created)
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } })
    return user ? UserMapper.toDomain(user) : null
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } })
    return user ? UserMapper.toDomain(user) : null
  }
}
