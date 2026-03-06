import { type Exercicio } from "./exercicios"

export type CheckinStatus = "INICIADO" | "CONCLUIDO"

export interface TreinoDiaExercicio {
  id: string
  treinoDiaId: string
  exercicioId: string
  ordem: number
  series?: number | null
  repeticoes?: string | null
  cargaSugerida?: number | null
  observacoes?: string | null
  metodo?: string | null
  exercicio?: Exercicio
}

export interface TreinoDia {
  id: string
  planoTreinoId: string
  titulo: string
  ordem: number
  diaSemana?: number | null
  observacoes?: string | null
  metodo?: string | null
  exercicios?: TreinoDiaExercicio[]
}

export interface PlanoTreino {
  id: string
  alunoId: string
  professorId: string
  nome: string
  observacoes?: string | null
  ativo: boolean
  dias?: TreinoDia[]
  createdAt: Date
  updatedAt: Date
}

export interface TreinoExercicioCheckin {
  id: string
  checkinId: string
  treinoDiaExercicioId: string
  exercicioId: string
  concluido: boolean
  cargaReal?: number | null
  repeticoesReal?: string | null
  comentarioAluno?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TreinoCheckin {
  id: string
  alunoId: string
  professorId: string
  planoTreinoId: string
  treinoDiaId: string
  status: CheckinStatus
  iniciadoEm: Date
  finalizadoEm?: Date | null
  dataTreino: Date
  comentarioAluno?: string | null
  comentarioProfessor?: string | null
  exercicios?: TreinoExercicioCheckin[]
  createdAt: Date
  updatedAt: Date
}
