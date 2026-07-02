import {
  PreparedCreateUserInput,
  PreparedUpdateUserInput,
  TransactionalUserRepository,
} from "../../../application/repositories/user-repository"
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
import { PrismaDatabaseClient } from "../prisma-database-client"

export class PrismaUserRepository implements TransactionalUserRepository {
  constructor(private readonly database: PrismaDatabaseClient = prisma) {}

  async create(data: CreateUserInput): Promise<User> {
    const passwordHash = await PasswordHelper.hash(data.password)
    return this.createPrepared({ ...data, passwordHash })
  }

  async createPrepared(data: PreparedCreateUserInput): Promise<User> {
    try {
      const created = await this.database.user.create({
        data: {
          email: data.email.trim().toLowerCase(),
          password: data.passwordHash,
          nome: data.nome,
          role: data.role ?? UserRole.ALUNO,
        },
      })

      return UserMapper.toDomain(created)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("Email já cadastrado", 409)
      }

      throw error
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.database.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: "insensitive",
        },
      },
    })
    return user ? UserMapper.toDomain(user) : null
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.database.user.findUnique({ where: { id } })
    return user ? UserMapper.toDomain(user) : null
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    return this.updatePrepared(id, {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.password !== undefined && {
        passwordHash: await PasswordHelper.hash(data.password),
      }),
    })
  }

  async updatePrepared(
    id: string,
    data: PreparedUpdateUserInput,
  ): Promise<User> {
    try {
      const updated = await this.database.user.update({
        where: { id },
        data: {
          ...(data.nome !== undefined && { nome: data.nome }),
          ...(data.email !== undefined && {
            email: data.email.trim().toLowerCase(),
          }),
          ...(data.passwordHash !== undefined && {
            password: data.passwordHash,
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

  async block(id: string, blockedAt = new Date()): Promise<User> {
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { blockedAt },
      })

      return UserMapper.toDomain(updated)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new AppError("Usuário não encontrado", 404)
        }
      }

      throw error
    }
  }

  async delete(id: string): Promise<void> {
    await this.database.user.delete({
      where: { id },
    })
  }
}
