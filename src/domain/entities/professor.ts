export interface Professor {
  id: string
  userId: string
  user?: {
    id: string
    nome: string
    email: string
    role: string
  }
  telefone?: string | null
  especialidade?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateProfessorInput {
  userId: string
  telefone?: string
  especialidade?: string
}

export interface UpdateProfessorInput {
  telefone?: string
  especialidade?: string
}
