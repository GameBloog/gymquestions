import { describe, it, expect, beforeEach } from "vitest"
import { LoginUseCase } from "../../../../src/application/use-cases/auth/login"
import { UserRole } from "../../../../src/domain/entities/user"
import { PasswordHelper } from "../../../../src/infraestructure/security/password"
import { AppError } from "../../../../src/shared/errors/app-error"
import { InMemoryUserRepository } from "../../../repositories/in-memory-user-repository"

describe("LoginUseCase", () => {
  let loginUseCase: LoginUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(() => {
    userRepository = new InMemoryUserRepository()
    loginUseCase = new LoginUseCase(userRepository)
  })

  it("should authenticate user with correct credentials", async () => {
    const hashedPassword = await PasswordHelper.hash("password123")

    await userRepository.create({
      email: "test@example.com",
      password: hashedPassword,
      nome: "Test User",
      role: UserRole.ALUNO,
    })

    const result = await loginUseCase.execute({
      email: "test@example.com",
      password: "password123",
    })

    expect(result).toHaveProperty("token")
    expect(result).toHaveProperty("user")
    expect(result.user.email).toBe("test@example.com")
    expect(result.user.nome).toBe("Test User")
  })

  it("should throw error if user not found", async () => {
    await expect(
      loginUseCase.execute({
        email: "nonexistent@example.com",
        password: "password123",
      })
    ).rejects.toThrow(AppError)

    await expect(
      loginUseCase.execute({
        email: "nonexistent@example.com",
        password: "password123",
      })
    ).rejects.toThrow("Email ou senha incorretos")
  })

  it("should throw error if password is incorrect", async () => {
    const hashedPassword = await PasswordHelper.hash("correctPassword")

    await userRepository.create({
      email: "test@example.com",
      password: hashedPassword,
      nome: "Test User",
      role: UserRole.ALUNO,
    })

    await expect(
      loginUseCase.execute({
        email: "test@example.com",
        password: "wrongPassword",
      })
    ).rejects.toThrow(AppError)

    await expect(
      loginUseCase.execute({
        email: "test@example.com",
        password: "wrongPassword",
      })
    ).rejects.toThrow("Email ou senha incorretos")
  })

  it("should return user without password in response", async () => {
    const hashedPassword = await PasswordHelper.hash("password123")

    await userRepository.create({
      email: "test@example.com",
      password: hashedPassword,
      nome: "Test User",
      role: UserRole.PROFESSOR,
    })

    const result = await loginUseCase.execute({
      email: "test@example.com",
      password: "password123",
    })

    expect(result.user).not.toHaveProperty("password")
    expect(result.user).toHaveProperty("id")
    expect(result.user).toHaveProperty("email")
    expect(result.user).toHaveProperty("nome")
    expect(result.user).toHaveProperty("role")
  })
})
