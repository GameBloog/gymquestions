export type GrupamentoMuscular =
  | "PEITO"
  | "COSTAS"
  | "PERNAS"
  | "OMBRO"
  | "BICEPS"
  | "TRICEPS"
  | "ABDOMEN"
  | "GLUTEOS"
  | "CARDIO"
  | "OUTRO"

export type OrigemExercicio = "SISTEMA" | "EXTERNO" | "PROFESSOR"

export interface Exercicio {
  id: string
  nome: string
  descricao?: string | null
  grupamentoMuscular: GrupamentoMuscular
  origem: OrigemExercicio
  externalId?: string | null
  externalSource?: string | null
  professorId?: string | null
  createdAt: Date
  updatedAt: Date
}
