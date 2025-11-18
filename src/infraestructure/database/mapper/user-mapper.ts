import { UserRole } from "../../../domain/entities/user"
import { User as PrismaUser } from "@prisma/client"
import { User } from "../../../domain/entities/user" 

export class UserMapper {
  static toDomain(raw: PrismaUser): User {
    return {
      id: raw.id,
      email: raw.email,
      password: raw.password,
      nome: raw.nome,
      role: raw.role as UserRole,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }
}
