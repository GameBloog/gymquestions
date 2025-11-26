export const PROFESSOR_PADRAO = {
  EMAIL: "professor.padrao@gym.com",
  ID: "224d987a-975a-4b3e-999b-51b37317c008",
  NOME: "Professor Padrão (Dados Antigos)",
} as const

export const DEFAULT_VALUES = {
  PAGINATION_LIMIT: 100,
  MIN_PASSWORD_LENGTH: 6,
  MIN_NAME_LENGTH: 2,
  MAX_TRAINING_DAYS: 7,
  MIN_TRAINING_DAYS: 0,
} as const

export const ERROR_MESSAGES = {
  PROFESSOR_PADRAO_NAO_ENCONTRADO:
    "Professor padrão não encontrado. Execute o script de migração: npm run migrate:answers",
  NENHUM_PROFESSOR_CADASTRADO: "Nenhum professor cadastrado no sistema",
  EMAIL_JA_CADASTRADO: "Email já cadastrado",
  USUARIO_NAO_ENCONTRADO: "Usuário não encontrado",
  ALUNO_NAO_ENCONTRADO: "Aluno não encontrado",
  PROFESSOR_NAO_ENCONTRADO: "Professor não encontrado",
  SEM_PERMISSAO: "Você não tem permissão para acessar este recurso",
} as const
