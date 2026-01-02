export interface AlunoHistorico {
  id: string
  alunoId: string

  pesoKg?: number | null
  alturaCm?: number | null
  cinturaCm?: number | null
  quadrilCm?: number | null
  pescocoCm?: number | null
  bracoEsquerdoCm?: number | null
  bracoDireitoCm?: number | null
  pernaEsquerdaCm?: number | null
  pernaDireitaCm?: number | null

  percentualGordura?: number | null
  massaMuscularKg?: number | null

  observacoes?: string | null
  registradoPor: string
  dataRegistro: Date
  createdAt: Date
}

export interface CreateAlunoHistoricoInput {
  alunoId: string
  pesoKg?: number
  alturaCm?: number
  cinturaCm?: number
  quadrilCm?: number
  pescocoCm?: number
  bracoEsquerdoCm?: number
  bracoDireitoCm?: number
  pernaEsquerdaCm?: number
  pernaDireitaCm?: number
  percentualGordura?: number
  massaMuscularKg?: number
  observacoes?: string
  registradoPor: string
  dataRegistro?: Date
}

export interface UpdateAlunoHistoricoInput
  extends Partial<
    Omit<CreateAlunoHistoricoInput, "alunoId" | "registradoPor">
  > {}

export interface HistoricoFiltros {
  dataInicio?: Date
  dataFim?: Date
  limite?: number
}
