import { ProfessorRepository } from "../../src/application/repositories/professor-repository"
import {
  Professor,
  CreateProfessorInput,
  UpdateProfessorInput,
} from "../../src/domain/entities/professor"
import { randomUUID } from "crypto"

export class InMemoryProfessorRepository implements ProfessorRepository {
  public professores: Professor[] = []

  async create(data: CreateProfessorInput): Promise<Professor> {
    const professor: Professor = {
      id: randomUUID(),
      userId: data.userId,
      telefone: data.telefone || null,
      especialidade: data.especialidade || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.professores.push(professor)
    return professor
  }

  async findById(id: string): Promise<Professor | null> {
    const professor = this.professores.find((p) => p.id === id)
    return professor || null
  }

  async findByUserId(userId: string): Promise<Professor | null> {
    const professor = this.professores.find((p) => p.userId === userId)
    return professor || null
  }

  async findMany(): Promise<Professor[]> {
    return this.professores
  }

  async findPadrao(): Promise<Professor | null> {
    const professor = this.professores.find((p: any) => p.isPadrao === true)
    return professor || null
  }

  async update(id: string, data: UpdateProfessorInput): Promise<Professor> {
    const index = this.professores.findIndex((p) => p.id === id)

    if (index === -1) {
      throw new Error("Professor não encontrado")
    }

    this.professores[index] = {
      ...this.professores[index],
      ...data,
      updatedAt: new Date(),
    }

    return this.professores[index]
  }

  async delete(id: string): Promise<void> {
    const index = this.professores.findIndex((p) => p.id === id)

    if (index === -1) {
      throw new Error("Professor não encontrado")
    }

    this.professores.splice(index, 1)
  }

  // Métodos auxiliares para testes
  clear() {
    this.professores = []
  }

  count(): number {
    return this.professores.length
  }

  addPadrao(userId: string): Professor {
    const professor: Professor & { isPadrao?: boolean } = {
      id: randomUUID(),
      userId,
      telefone: null,
      especialidade: "Professor Padrão",
      createdAt: new Date(),
      updatedAt: new Date(),
      isPadrao: true,
    }

    this.professores.push(professor)
    return professor
  }
}
