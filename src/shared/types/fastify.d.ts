import "fastify"
import { UserRole } from "@/domain/entities/user"

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      role: UserRole
    }
  }
}
