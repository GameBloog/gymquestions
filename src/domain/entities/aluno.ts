export interface Aluno {
  id: string
  userId: string
  professorId: string
  ativo: boolean
  user?:{
    nome: string
    email: string
  }
  sexoBiologico?: "MASCULINO" | "FEMININO" | null
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
  objetivos_atuais?: string | null
  toma_remedio?: boolean | null
  remedios_uso?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateAlunoInput {
  userId: string
  professorId: string
  ativo?: boolean
  sexoBiologico?: "MASCULINO" | "FEMININO" | null
  telefone?: string | null
  alturaCm?: number | null
  pesoKg?: number | null
  idade?: number | null
  cinturaCm?: number | null
  quadrilCm?: number | null
  pescocoCm?: number | null
  alimentos_quer_diario?: string[] | null
  alimentos_nao_comem?: string[] | null
  alergias_alimentares?: string[] | null
  dores_articulares?: string | null
  suplementos_consumidos?: string[] | null
  dias_treino_semana?: number | null
  frequencia_horarios_refeicoes?: string | null
  objetivos_atuais?: string | null
  toma_remedio?: boolean | null
  remedios_uso?: string | null
}

export interface UpdateAlunoInput
  extends Partial<Omit<CreateAlunoInput, "userId" | "professorId">> {
  ativo?: boolean
}
