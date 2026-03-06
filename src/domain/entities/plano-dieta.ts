export type ObjetivoDieta = "MANTER" | "PERDER" | "GANHAR"
export type OrigemAlimento = "SISTEMA" | "EXTERNO" | "PROFESSOR"

export interface Alimento {
  id: string
  nome: string
  descricao?: string | null
  origem: OrigemAlimento
  externalId?: string | null
  fonteExterna?: string | null
  calorias100g: number
  proteinas100g: number
  carboidratos100g: number
  gorduras100g: number
  fibras100g?: number | null
  professorId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PlanoDieta {
  id: string
  alunoId: string
  professorId: string
  nome: string
  objetivo: ObjetivoDieta
  percentualGordura?: number | null
  massaMagraKg?: number | null
  tmbKcal?: number | null
  fatorAtividade?: number | null
  caloriasMeta: number
  proteinasMetaG: number
  carboidratosMetaG: number
  gordurasMetaG: number
  observacoes?: string | null
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}
