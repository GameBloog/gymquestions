export interface UserAnswer {
  id: string
  createdAt: Date
  nome: string
  email: string
  telefone?: string | null
  alturaCm?: number | null
  pesoKg?: number | null
  idade?: number | null
  cinturaCm?: number | null
  quadrilCm?: number | null
  pescocoCm?: number | null
  alimentos_quer_diario?: unknown | null
  alimentos_nao_comem?: unknown | null
  alergias_alimentares?: unknown | null
  dores_articulares?: string | null
  suplementos_consumidos?: unknown | null
  dias_treino_semana?: number | null
  frequencia_horarios_refeicoes?: string | null
}

export interface CreateUserAnswerInput {
  nome: string
  email: string
  telefone?: string
  alturaCm?: number
  pesoKg?: number
  idade?: number
  cinturaCm?: number
  quadrilCm?: number
  pescocoCm?: number
  alimentos_quer_diario?: string[]
  alimentos_nao_comem?: string[]
  alergias_alimentares?: string[]
  dores_articulares?: string
  suplementos_consumidos?: string[]
  dias_treino_semana?: number
  frequencia_horarios_refeicoes?: string
}

export interface UpdateUserAnswerInput extends Partial<CreateUserAnswerInput> {}
