export enum UserRole {
  ADMIN = "ADMIN",
  PROFESSOR = "PROFESSOR",
  ALUNO = "ALUNO",
}

export interface User {
  id: string
  email: string
  password: string
  nome: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserInput {
  email: string
  password: string
  nome: string
  role?: UserRole
}

export interface LoginInput {
  email: string
  password: string
}

export interface LoginOutput {
  token: string
  user: {
    id: string
    nome: string
    email: string
    role: UserRole
  }
}
