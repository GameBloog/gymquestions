export const DEFAULT_VALUES = {
  PAGINATION_LIMIT: 100,
  MIN_PASSWORD_LENGTH: 6,
  MIN_NAME_LENGTH: 2,
  MAX_TRAINING_DAYS: 7,
  MIN_TRAINING_DAYS: 0,
} as const

export const ERROR_MESSAGES = {
  EMAIL_JA_CADASTRADO: "Email já cadastrado",
  USUARIO_NAO_ENCONTRADO: "Usuário não encontrado",
  ALUNO_NAO_ENCONTRADO: "Aluno não encontrado",
  PROFESSOR_NAO_ENCONTRADO: "Professor não encontrado",
  PROFESSOR_PADRAO_NAO_ENCONTRADO:
    "Professor padrão não configurado. Execute o seed: pnpm run db:seed",
  SEM_PERMISSAO: "Você não tem permissão para acessar este recurso",
  NENHUM_PROFESSOR_CADASTRADO: "Nenhum professor cadastrado no sistema",
} as const

