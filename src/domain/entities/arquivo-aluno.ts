import { TipoArquivo } from "@prisma/client"

export { TipoArquivo }

export interface ArquivoAluno {
  id: string
  alunoId: string
  professorId: string
  tipo: TipoArquivo
  titulo: string
  descricao?: string | null
  url: string
  publicId: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateArquivoAlunoInput {
  alunoId: string
  professorId: string
  tipo: TipoArquivo
  titulo: string
  descricao?: string
  url: string
  publicId: string
}

export interface UpdateArquivoAlunoInput {
  titulo?: string
  descricao?: string
}
