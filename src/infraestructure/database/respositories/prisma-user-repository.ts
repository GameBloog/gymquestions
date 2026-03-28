import { UserRepository } from "../../../application/repositories/user-repository"
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserRole,
} from "../../../domain/entities/user"
import { prisma } from "../prisma"
import { PasswordHelper } from "../../security/password"
import { UserMapper } from "../mapper/user-mapper"
import { AppError } from "@/shared/errors/app-error"
import { Prisma } from "@prisma/client"

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

  async update(id: string, data: UpdateUserInput): Promise<User> {
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(data.nome !== undefined && { nome: data.nome }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.password !== undefined && {
            password: await PasswordHelper.hash(data.password),
          }),
        },
      })

      return UserMapper.toDomain(updated)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new AppError("Email já cadastrado", 409)
        }

        if (error.code === "P2025") {
          throw new AppError("Usuário não encontrado", 404)
        }
      }

      throw error
    }
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    })
  }
}
