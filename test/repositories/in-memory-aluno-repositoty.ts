import { AlunoRepository } from "../../src/application/repositories/aluno-repository"
import {
  Aluno,
  CreateAlunoInput,
  UpdateAlunoInput,
} from "../../src/domain/entities/aluno"
import { randomUUID } from "crypto"

export class InMemoryAlunoRepository implements AlunoRepository {
  public alunos: Aluno[] = []

  async create(data: CreateAlunoInput): Promise<Aluno> {
    const aluno: Aluno = {
      id: randomUUID(),
      userId: data.userId,
      professorId: data.professorId,
      telefone: data.telefone || null,
      alturaCm: data.alturaCm || null,
      pesoKg: data.pesoKg || null,
      idade: data.idade || null,
      cinturaCm: data.cinturaCm || null,
      quadrilCm: data.quadrilCm || null,
      pescocoCm: data.pescocoCm || null,
      alimentos_quer_diario: data.alimentos_quer_diario || null,
      alimentos_nao_comem: data.alimentos_nao_comem || null,
      alergias_alimentares: data.alergias_alimentares || null,
      dores_articulares: data.dores_articulares || null,
      suplementos_consumidos: data.suplementos_consumidos || null,
      dias_treino_semana: data.dias_treino_semana || null,
      frequencia_horarios_refeicoes: data.frequencia_horarios_refeicoes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.alunos.push(aluno)
    return aluno
  }

  async findById(id: string): Promise<Aluno | null> {
    const aluno = this.alunos.find((a) => a.id === id)
    return aluno || null
  }

  async findByUserId(userId: string): Promise<Aluno | null> {
    const aluno = this.alunos.find((a) => a.userId === userId)
    return aluno || null
  }

  async findMany(): Promise<Aluno[]> {
    return this.alunos
  }

  async findManyByProfessor(professorId: string): Promise<Aluno[]> {
    return this.alunos.filter((a) => a.professorId === professorId)
  }

  async update(id: string, data: UpdateAlunoInput): Promise<Aluno> {
    const index = this.alunos.findIndex((a) => a.id === id)

    if (index === -1) {
      throw new Error("Aluno não encontrado")
    }

    this.alunos[index] = {
      ...this.alunos[index],
      ...data,
      updatedAt: new Date(),
    }

    return this.alunos[index]
  }

  async delete(id: string): Promise<void> {
    const index = this.alunos.findIndex((a) => a.id === id)

    if (index === -1) {
      throw new Error("Aluno não encontrado")
    }

    this.alunos.splice(index, 1)
  }

  clear() {
    this.alunos = []
  }

  count(): number {
    return this.alunos.length
  }
}
