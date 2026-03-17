# 🧪 Guia de Testes - API Gym

Este documento explica como executar e entender os testes da aplicação.

## 📋 Índice

1. [Tipos de Testes](#tipos-de-testes)
2. [Configuração](#configuração)
3. [Executando os Testes](#executando-os-testes)
4. [Estrutura dos Testes](#estrutura-dos-testes)
5. [Repositórios In-Memory](#repositórios-in-memory)
6. [Banco de Dados de Testes](#banco-de-dados-de-testes)
7. [Scripts Automatizados](#scripts-automatizados)
8. [Cobertura de Testes](#cobertura-de-testes)

---

## 🎯 Tipos de Testes

### Testes Unitários ⚡

Testam unidades individuais de código **isoladamente** usando **repositórios in-memory**.

**Vantagens:**
- ✅ Extremamente rápidos (sem I/O)
- ✅ Não precisam de banco de dados
- ✅ Isolamento total
- ✅ Podem rodar em qualquer ambiente

**Localização:** `tests/unit/**/*.spec.ts`

**Exemplos:**
- `PasswordHelper` e `JwtHelper`
- Use cases (LoginUseCase, RegisterUseCase, etc)

### Testes E2E (End-to-End) 🔄

Testam fluxos completos da aplicação com **banco de dados real** e requisições HTTP.

**Vantagens:**
- ✅ Testa integração real
- ✅ Valida comportamento completo
- ✅ Detecta problemas de integração

**Localização:** `tests/e2e/**/*.e2e.spec.ts`

**Exemplos:**
- Rotas de autenticação
- CRUD de alunos e professores

---

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Criar Arquivo .env.test

```bash
cp .env.test.example .env.test
```

Edite o `.env.test` com as configurações de teste:

```bash
NODE_ENV=test
PORT=3334
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/api_gym_test?schema=public"
JWT_SECRET=test_secret_key_for_testing_purposes_with_64_characters_minimum
JWT_EXPIRES_IN=1d
BCRYPT_ROUNDS=10
```

### 3. Dar Permissão ao Script de Setup

```bash
chmod +x scripts/test-setup.sh
```

---

## 🚀 Executando os Testes

### Método Rápido (Recomendado) 🎯

#### Setup Completo + Testes

```bash
# Inicia banco, executa migrações e todos os testes
./scripts/test-setup.sh full all
```

#### Apenas Testes Unitários (Sem Banco)

```bash
# Rápido - não precisa de banco de dados
pnpm run test:unit
```

#### Testes E2E (Com Banco)

```bash
# 1. Iniciar banco de testes
pnpm run db:test:start

# 2. Executar migrações de teste
pnpm run db:test:migrate

# 3. Executar testes E2E
pnpm run test:e2e

# 4. (Opcional) Parar banco
pnpm run db:test:stop
```

---

### Método Manual (Passo a Passo) 📝

#### 1. Iniciar Banco de Dados de Testes

```bash
# Usando o script
./scripts/test-setup.sh start

# OU usando Docker Compose diretamente
docker compose -f docker-compose.test.yml up -d
```

#### 2. Executar Migrações

```bash
# Usando o script
./scripts/test-setup.sh migrate

# OU manualmente
export $(cat .env.test | grep -v '^#' | xargs)
pnpm prisma migrate deploy
```

#### 3. Executar Testes

```bash
# Testes unitários (não precisa de banco)
pnpm run test:unit

# Testes E2E (precisa de banco rodando)
pnpm run test:e2e

# Todos os testes
pnpm run test:all

# Com cobertura
pnpm run test:coverage
```

#### 4. Parar Banco de Testes

```bash
./scripts/test-setup.sh stop
```

---

## 🛠️ Scripts Automatizados

### Script Principal: `test-setup.sh`

```bash
# Ver ajuda
./scripts/test-setup.sh

# Iniciar banco de testes
./scripts/test-setup.sh start

# Parar banco de testes
./scripts/test-setup.sh stop

# Resetar banco (remove volumes)
./scripts/test-setup.sh reset

# Executar migrações
./scripts/test-setup.sh migrate

# Executar testes
./scripts/test-setup.sh test unit     # Apenas unitários
./scripts/test-setup.sh test e2e      # Apenas E2E
./scripts/test-setup.sh test all      # Todos
./scripts/test-setup.sh test coverage # Com cobertura

# Setup completo + testes
./scripts/test-setup.sh full all      # Tudo
./scripts/test-setup.sh full e2e      # Apenas E2E
```

### Scripts do package.json

```bash
# Testes
pnpm run test:unit       # Unitários
pnpm run test:unit:watch # Unitários (watch mode)
pnpm run test:e2e        # E2E
pnpm run test:e2e:watch  # E2E (watch mode)
pnpm run test:all        # Todos
pnpm run test:coverage   # Com cobertura

# Gerenciamento do banco
pnpm run db:test:start   # Iniciar banco de testes
pnpm run db:test:stop    # Parar banco de testes
pnpm run db:test:reset   # Resetar banco de testes
```

---

## 📁 Estrutura dos Testes

```
tests/
├── helpers/
│   └── test-helpers.ts              # Utilitários para E2E
├── repositories/
│   ├── in-memory-user-repository.ts
│   ├── in-memory-professor-repository.ts
│   ├── in-memory-aluno-repository.ts
│   └── in-memory-invite-code-repository.ts
├── unit/
│   ├── security/
│   │   ├── password.spec.ts
│   │   └── jwt.spec.ts
│   └── use-cases/
│       ├── auth/
│       │   ├── login.spec.ts
│       │   └── register.spec.ts
│       ├── aluno/
│       │   ├── create-aluno.spec.ts
│       │   └── update-aluno.spec.ts
│       └── invite-code/
│           └── validate.spec.ts
└── e2e/
    ├── auth.e2e.spec.ts
    ├── aluno.e2e.spec.ts
    └── professor.e2e.spec.ts
```

---

## 🗄️ Repositórios In-Memory

Os testes unitários usam implementações in-memory dos repositórios, sem dependência de banco de dados.

### Vantagens

- ⚡ **Extremamente rápidos** (sem I/O)
- 🔒 **Isolamento total** (sem efeitos colaterais)
- 🎯 **Previsíveis** (estado controlado)
- 🚀 **CI/CD friendly** (não precisa de infraestrutura)

### Exemplo de Uso

```typescript
import { InMemoryUserRepository } from "../../../repositories/in-memory-user-repository"

describe("LoginUseCase", () => {
  let userRepository: InMemoryUserRepository

  beforeEach(() => {
    userRepository = new InMemoryUserRepository()
  })

  it("should authenticate user", async () => {
    // Criar usuário no repositório in-memory
    await userRepository.create({
      email: "test@example.com",
      password: "hashedPassword",
      nome: "Test User",
    })

    // Testar use case
    // ...
  })
})
```

### Repositórios Disponíveis

- `InMemoryUserRepository`
- `InMemoryProfessorRepository`
- `InMemoryAlunoRepository`
- `InMemoryInviteCodeRepository`

---

## 🐳 Banco de Dados de Testes

### Portas Utilizadas

- **Banco de Desenvolvimento**: `5433`
- **Banco de Testes**: `5434`

Isso permite rodar ambos simultaneamente sem conflitos!

### Configuração do Docker

O arquivo `docker-compose.test.yml` configura um PostgreSQL isolado para testes:

```yaml
services:
  db-test:
    image: postgres:15
    container_name: api-gym-db-test
    ports:
      - "5434:5432"  # Porta diferente!
    environment:
      POSTGRES_DB: api_gym_test
```

### Gerenciando o Banco de Testes

```bash
# Iniciar
docker compose -f docker-compose.test.yml up -d

# Parar
docker compose -f docker-compose.test.yml down

# Resetar (remove volumes)
docker compose -f docker-compose.test.yml down -v

# Ver logs
docker compose -f docker-compose.test.yml logs -f

# Status
docker compose -f docker-compose.test.yml ps
```

### Conectar Manualmente

```bash
# Via psql
psql -h localhost -p 5434 -U postgres -d api_gym_test

# Via Prisma Studio (altere DATABASE_URL temporariamente)
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/api_gym_test" pnpm db:studio
```

---

## 🎯 Cobertura de Testes

### Testes Unitários

#### Security
- ✅ `PasswordHelper.hash()`
- ✅ `PasswordHelper.compare()`
- ✅ `JwtHelper.generate()`
- ✅ `JwtHelper.verify()`

#### Use Cases - Auth
- ✅ `LoginUseCase` - autenticação com credenciais válidas/inválidas
- ✅ `RegisterUseCase` - registro de ALUNO, PROFESSOR, ADMIN
- ✅ `ValidateInviteCodeUseCase` - validação de códigos de convite

#### Use Cases - Aluno
- ✅ `CreateAlunoUseCase` - criação de aluno com validações
- ✅ `UpdateAlunoUseCase` - atualização parcial e completa
- ✅ `GetAlunoByIdUseCase` - busca por ID
- ✅ `DeleteAlunoUseCase` - exclusão de aluno

### Testes E2E

#### Auth Routes (`/auth/*`)
- ✅ `POST /auth/register` - registro de usuários
- ✅ `POST /auth/login` - autenticação
- ✅ `GET /auth/me` - informações do usuário logado
- ✅ `POST /auth/invite-codes` - criação de códigos (ADMIN only)
- ✅ `GET /auth/invite-codes` - listagem de códigos (ADMIN only)

#### Aluno Routes (`/alunos/*`)
- ✅ `POST /alunos` - criação de aluno (ADMIN, PROFESSOR)
- ✅ `GET /alunos` - listagem com filtros por role
- ✅ `GET /alunos/:id` - busca individual com permissões
- ✅ `PUT /alunos/:id` - atualização com permissões
- ✅ `DELETE /alunos/:id` - exclusão com permissões

#### Professor Routes (`/professores/*`)
- ✅ `POST /professores` - criação (ADMIN only)
- ✅ `GET /professores` - listagem
- ✅ `GET /professores/:id` - busca individual
- ✅ `PUT /professores/:id` - atualização (ADMIN only)
- ✅ `DELETE /professores/:id` - exclusão com validações

---

## 📊 Cenários de Teste

### Autenticação
- ✅ Login com credenciais válidas
- ✅ Login com email inexistente
- ✅ Login com senha incorreta
- ✅ Registro de ALUNO sem convite
- ✅ Registro de PROFESSOR com convite
- ✅ Registro de ADMIN com convite
- ✅ Validação de email duplicado
- ✅ Validação de código de convite
- ✅ Código de convite já usado
- ✅ Código de convite expirado

### Permissões
- ✅ ADMIN pode acessar todos os recursos
- ✅ PROFESSOR pode gerenciar apenas seus alunos
- ✅ ALUNO pode ver/editar apenas seu perfil
- ✅ ALUNO não pode deletar sua conta
- ✅ PROFESSOR não pode criar outros professores

### Validações
- ✅ Campos obrigatórios (nome, email, password)
- ✅ Formato de email válido
- ✅ Senha mínima (6 caracteres)
- ✅ UUIDs válidos nos parâmetros
- ✅ Validação de arrays (alimentos, alergias, etc)

### Relacionamentos
- ✅ Aluno vinculado ao professor correto
- ✅ Fallback para professor padrão
- ✅ Não pode deletar professor com alunos
- ✅ Não pode deletar professor padrão
- ✅ Cascade delete (user -> aluno/professor)

---

## 🧰 Utilitários de Teste

### `test-helpers.ts`

```typescript
// Limpar banco de dados
await cleanDatabase()

// Criar usuários de teste
const admin = await createTestAdmin()
const { user, professor } = await createTestProfessor()
const { user, aluno } = await createTestAluno(professorId)

// Gerar tokens
const token = generateToken({
  userId: user.id,
  email: user.email,
  role: UserRole.ADMIN
})

// Criar código de convite
const code = await createInviteCode(adminId, UserRole.PROFESSOR)
```

---

## ✅ Boas Práticas

### 1. Isolamento de Testes

Cada teste deve ser independente. Use `beforeEach` para limpar o banco:

```typescript
beforeEach(async () => {
  await cleanDatabase()
})
```

### 2. Nomenclatura Clara

```typescript
it("should create aluno as ADMIN", async () => {
  // ...
})

it("should fail to create aluno as ALUNO", async () => {
  // ...
})
```

### 3. Arrange-Act-Assert

```typescript
it("should update aluno data", async () => {
  // Arrange
  const aluno = await createTestAluno(professorId)
  const token = generateToken(...)

  // Act
  const response = await app.inject({
    method: "PUT",
    url: `/alunos/${aluno.id}`,
    headers: { authorization: `Bearer ${token}` },
    payload: { pesoKg: 85 }
  })

  // Assert
  expect(response.statusCode).toBe(200)
  expect(response.body.pesoKg).toBe(85)
})
```

### 4. Testar Casos de Sucesso e Erro

```typescript
describe("POST /alunos", () => {
  it("should create aluno successfully", async () => {
    // teste de sucesso
  })

  it("should fail with invalid data", async () => {
    // teste de erro
  })

  it("should fail without authentication", async () => {
    // teste de erro
  })
})
```

### 5. Mocks em Testes Unitários

Use `vi.fn()` para mockar dependências:

```typescript
const mockRepository = {
  findById: vi.fn().mockResolvedValue(mockData),
  create: vi.fn().mockResolvedValue(createdData),
}
```

### 6. Não Mockar em Testes E2E

Testes E2E devem usar o banco real (de teste) para validar integrações.

---

## 🐛 Debug de Testes

### Ver Logs Detalhados

```bash
# Com logs do Vitest
pnpm test --reporter=verbose

# Com logs do Prisma
DEBUG=prisma:* pnpm test:e2e
```

### Executar Teste Específico

```bash
# Por nome do arquivo
pnpm test auth.e2e

# Por nome do teste
pnpm test -t "should login with valid credentials"
```

### Modo Debug no VSCode

Adicione em `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test:unit", "--no-coverage"],
  "console": "integratedTerminal"
}
```

---

## 📈 Métricas de Qualidade

### Metas de Cobertura

- **Geral**: > 80%
- **Use Cases**: > 90%
- **Controllers**: > 85%
- **Helpers/Utils**: 100%

### Comando para Verificar

```bash
pnpm test:coverage
```

---

## 🚨 Troubleshooting

### Erro: "Port already in use"

```bash
# Encerrar processos na porta 3333
lsof -ti:3333 | xargs kill -9
```

### Erro: "Database connection failed"

```bash
# Verificar se o PostgreSQL está rodando
docker ps

# Reiniciar container
docker compose -f docker-compose.test.yml restart db-test
```

### Erro: "Cannot find module"

```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Testes E2E Lentos

```bash
# Executar em paralelo (com cuidado!)
pnpm test:e2e --pool=threads --poolOptions.threads.singleThread=false

# Ou executar arquivo específico
pnpm test:e2e auth.e2e
```

---

## 📚 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Fastify Testing](https://fastify.dev/docs/latest/Guides/Testing/)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)

---

## 🎓 Próximos Passos

Para expandir a suíte de testes:

1. ✅ Testes de integração com serviços externos (se houver)
2. ✅ Testes de performance/carga
3. ✅ Testes de segurança (SQL injection, XSS, etc)
4. ✅ Testes de acessibilidade
5. ✅ Snapshot testing para respostas complexas

---

**✨ Lembre-se**: Testes são documentação viva do seu código. Mantenha-os atualizados!
