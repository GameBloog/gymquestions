export interface FotoShape {
  id: string
  alunoId: string
  url: string
  publicId: string
  descricao?: string | null
  createdAt: Date
}

export interface CreateFotoShapeInput {
  alunoId: string
  url: string
  publicId: string
  descricao?: string
}
