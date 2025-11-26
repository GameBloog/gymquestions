# 🎨 API Gym - Documentação Completa para Frontend

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Regras de Negócio](#regras-de-negócio)
3. [Fluxos de Usuário](#fluxos-de-usuário)
4. [Endpoints da API](#endpoints-da-api)
5. [Telas Sugeridas](#telas-sugeridas)
6. [Componentes Recomendados](#componentes-recomendados)
7. [Estados e Permissões](#estados-e-permissões)

---

## 🎯 Visão Geral do Sistema

### O que é o API Gym?

Sistema de gerenciamento de alunos de academia com 3 tipos de usuários:

- **👑 ADMIN**: Gerencia todo o sistema, cria professores, vê todos os dados
- **🎓 PROFESSOR**: Gerencia seus próprios alunos, não vê alunos de outros professores
- **💪 ALUNO**: Vê e edita apenas seu próprio perfil

### Principais Funcionalidades

1. **Autenticação JWT** (login/registro)
2. **Sistema de Convites** (apenas admin pode criar professores)
3. **Gestão de Alunos** (vinculados a professores)
4. **Perfil Completo** (dados físicos, alimentação, treino)

---

## 📜 Regras de Negócio

### 1. Registro de Usuários

#### Aluno (Qualquer pessoa pode se registrar)
```
✅ Não precisa de código de convite
✅ Email único no sistema
✅ Senha mínima: 6 caracteres
✅ Automaticamente vira ALUNO
```

#### Professor (Precisa de convite)
```
⚠️  PRECISA de código de convite
✅ Código gerado apenas por ADMIN
✅ Cada código pode ser usado apenas 1 vez
⏰ Códigos podem ter data de expiração
✅ Ao registrar, cria User + Professor automaticamente
```

#### Admin (Precisa de convite)
```
⚠️  PRECISA de código de convite especial
🔒 Apenas outro ADMIN pode gerar código de ADMIN
```

---

### 2. Gestão de Alunos

#### Criação de Aluno

**Por Professor:**
```typescript
✅ Pode criar alunos apenas para SI MESMO
❌ NÃO pode criar para outro professor
📝 Deve fornecer: nome, email, senha
🎯 professorId deve ser o ID do próprio professor
```

**Por Admin:**
```typescript
✅ Pode criar aluno para QUALQUER professor
📝 Escolhe qual professor vinculará o aluno
```

**Exemplo de fluxo:**
1. Professor/Admin acessa "Novo Aluno"
2. Preenche formulário (nome, email, senha, dados físicos)
3. Sistema valida se pode criar para aquele professor
4. Cria User + Aluno vinculado ao professor
5. Aluno recebe credenciais por email (implementar)

---

#### Listagem de Alunos

**Admin:**
```
📊 Vê TODOS os alunos do sistema
🔍 Pode filtrar por professor
📈 Vê estatísticas gerais
```

**Professor:**
```
📊 Vê APENAS seus próprios alunos
❌ Não vê alunos de outros professores
🔍 Pode filtrar/ordenar seus alunos
```

**Aluno:**
```
👤 Vê APENAS seu próprio perfil
📊 GET /alunos retorna array com 1 item (ele mesmo)
```

---

#### Atualização de Perfil

**Admin:**
```
✅ Pode atualizar qualquer aluno
📝 Acesso total a todos os campos
```

**Professor:**
```
✅ Pode atualizar apenas SEUS alunos
📝 Geralmente atualiza: peso, medidas, treino
❌ Não atualiza nome/email do aluno
```

**Aluno:**
```
✅ Pode atualizar APENAS seu próprio perfil
📝 Atualiza: peso, medidas, alimentação, etc
❌ Não pode mudar seu professor
```

---

#### Exclusão de Aluno

```
✅ ADMIN: pode deletar qualquer aluno
✅ PROFESSOR: pode deletar apenas seus alunos
❌ ALUNO: não pode se deletar
⚠️  Deletar aluno também deleta o User (cascade)
```

---

### 3. Códigos de Convite

#### Geração
```
🔒 Apenas ADMIN pode gerar
🎫 Formato: "PROF-2025-ABC123XY"
⏰ Pode ter validade (dias)
🔢 Código único, não reutilizável
```

#### Uso
```
✅ Usado no registro de PROFESSOR ou ADMIN
❌ Não pode ser usado duas vezes
⏰ Verifica se está expirado
🔍 Valida se é do role correto
```

---

## 🔄 Fluxos de Usuário

### Fluxo 1: Primeiro Acesso (Criar Admin)

```
1. Registrar primeiro usuário como ALUNO
   POST /auth/register { nome, email, password }

2. Promover manualmente para ADMIN no banco
   (Prisma Studio ou SQL direto)

3. Fazer login como ADMIN
   POST /auth/login

4. Criar código de convite para outros admins
   POST /auth/invite-codes { role: "ADMIN" }
```

---

### Fluxo 2: Admin Adiciona Professor

```
1. Admin faz login
   POST /auth/login

2. Admin gera código de convite
   POST /auth/invite-codes { role: "PROFESSOR", expiresInDays: 30 }
   → Retorna: "PROF-2025-ABC123"

3. Admin envia código ao professor (email, whatsapp, etc)

4. Professor acessa página de registro
   Formulário com:
   - Nome
   - Email
   - Senha
   - Código de Convite
   - Telefone (opcional)
   - Especialidade (opcional)

5. Professor se registra
   POST /auth/register {
     nome, email, password,
     role: "PROFESSOR",
     inviteCode: "PROF-2025-ABC123",
     telefone, especialidade
   }

6. Sistema cria User + Professor automaticamente
```

---

### Fluxo 3: Professor Adiciona Aluno

```
1. Professor faz login
   POST /auth/login

2. Professor acessa "Novo Aluno"
   Formulário com:
   - Nome
   - Email
   - Senha temporária
   - Dados físicos (altura, peso, idade)
   - Dados de treino (dias_treino_semana)
   - Alimentação (arrays)

3. Professor cria aluno
   POST /alunos {
     nome, email, password,
     professorId: "ID_DO_PROFESSOR", // pegar de /auth/me
     alturaCm, pesoKg, idade, ...
   }

4. Sistema:
   - Cria User com role ALUNO
   - Cria Aluno vinculado ao professor
   - Retorna sucesso

5. Professor envia credenciais ao aluno (email/SMS)
```

---

### Fluxo 4: Aluno Acessa Seu Perfil

```
1. Aluno recebe email com credenciais

2. Aluno faz login
   POST /auth/login { email, password }

3. Aluno vê dashboard com:
   - Seus dados físicos atuais
   - Evolução de peso
   - Plano alimentar
   - Dias de treino

4. Aluno pode editar:
   - Peso, medidas
   - Alimentação
   - Observações
   
   PUT /alunos/:id { pesoKg: 75, ... }

5. Aluno não pode:
   - Ver outros alunos
   - Trocar de professor
   - Deletar sua conta
```

---

### Fluxo 5: Professor Gerencia Alunos

```
1. Professor faz login

2. Professor vê lista de SEUS alunos
   GET /alunos → retorna apenas seus alunos

3. Professor clica em um aluno
   GET /alunos/:id

4. Professor vê/edita:
   - Ficha completa
   - Histórico de peso
   - Alimentação
   - Treino
   
   PUT /alunos/:id { ... }

5. Professor pode:
   - Adicionar observações
   - Atualizar medidas
   - Ajustar plano alimentar
```

---

## 📡 Endpoints da API

### Base URL
```
http://localhost:3333
```

---

### 🔐 Autenticação

#### POST /auth/register
Registrar novo usuário

**Body:**
```typescript
{
  nome: string           // mín 2 chars
  email: string          // email válido
  password: string       // mín 6 chars
  role?: "ADMIN" | "PROFESSOR" | "ALUNO"  // default: ALUNO
  inviteCode?: string    // obrigatório se role = PROFESSOR/ADMIN
  telefone?: string      // apenas se PROFESSOR
  especialidade?: string // apenas se PROFESSOR
}
```

**Respostas:**
- `201`: Usuário criado
- `400`: Dados inválidos ou código de convite inválido
- `409`: Email já cadastrado

---

#### POST /auth/login
Fazer login

**Body:**
```typescript
{
  email: string
  password: string
}
```

**Resposta 200:**
```typescript
{
  token: string  // JWT válido por 7 dias
  user: {
    id: string
    nome: string
    email: string
    role: "ADMIN" | "PROFESSOR" | "ALUNO"
  }
}
```

**Erros:**
- `400`: Dados inválidos
- `401`: Email ou senha incorretos

**⚠️ Frontend deve armazenar o token (localStorage/cookies)**

---

#### GET /auth/me
Ver perfil do usuário logado

**Headers:**
```
Authorization: Bearer {token}
```

**Resposta 200:**
```typescript
{
  id: string
  nome: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}
```

---

### 🎫 Códigos de Convite (Admin Only)

#### POST /auth/invite-codes
Criar código de convite

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Body:**
```typescript
{
  role: "PROFESSOR" | "ADMIN"
  expiresInDays?: number  // opcional, default: sem expiração
}
```

**Resposta 201:**
```typescript
{
  id: string
  code: string           // ex: "PROF-2025-A1B2C3D4"
  role: string
  usedBy: null
  usedAt: null
  expiresAt: string | null
  createdBy: string
  createdAt: string
}
```

**Erros:**
- `401`: Não autenticado
- `403`: Não é admin

---

#### GET /auth/invite-codes
Listar códigos de convite

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Resposta 200:**
```typescript
[
  {
    id: string
    code: string
    role: string
    usedBy: string | null   // userId de quem usou
    usedAt: string | null
    expiresAt: string | null
    createdBy: string
    createdAt: string
  }
]
```

---

### 🎓 Alunos

#### POST /alunos
Criar novo aluno

**Headers:**
```
Authorization: Bearer {professor_ou_admin_token}
```

**Body:**
```typescript
{
  // Dados do User
  nome: string
  email: string
  password: string
  
  // Vinculação
  professorId: string  // UUID do professor
  
  // Dados físicos (opcionais)
  telefone?: string
  alturaCm?: number
  pesoKg?: number
  idade?: number
  cinturaCm?: number
  quadrilCm?: number
  pescocoCm?: number
  
  // Alimentação (opcionais)
  alimentos_quer_diario?: string[]
  alimentos_nao_comem?: string[]
  alergias_alimentares?: string[]
  suplementos_consumidos?: string[]
  
  // Treino (opcionais)
  dores_articulares?: string
  dias_treino_semana?: number  // 0-7
  frequencia_horarios_refeicoes?: string
}
```

**Resposta 201:**
```typescript
{
  id: string
  userId: string
  professorId: string
  // ... todos os campos enviados
  createdAt: string
  updatedAt: string
}
```

**Erros:**
- `400`: Dados inválidos ou professorId inválido
- `403`: Professor tentando criar para outro professor
- `404`: Professor não encontrado
- `409`: Email já cadastrado

---

#### GET /alunos
Listar alunos (com filtros por role)

**Headers:**
```
Authorization: Bearer {token}
```

**Comportamento por Role:**
- **ADMIN**: retorna TODOS os alunos
- **PROFESSOR**: retorna apenas seus alunos
- **ALUNO**: retorna apenas ele mesmo (array com 1 item)

**Resposta 200:**
```typescript
[
  {
    id: string
    userId: string
    professorId: string
    telefone: string | null
    alturaCm: number | null
    pesoKg: number | null
    idade: number | null
    cinturaCm: number | null
    quadrilCm: number | null
    pescocoCm: number | null
    alimentos_quer_diario: string[] | null
    alimentos_nao_comem: string[] | null
    alergias_alimentares: string[] | null
    dores_articulares: string | null
    suplementos_consumidos: string[] | null
    dias_treino_semana: number | null
    frequencia_horarios_refeicoes: string | null
    createdAt: string
    updatedAt: string
  }
]
```

---

#### GET /alunos/:id
Buscar aluno por ID

**Headers:**
```
Authorization: Bearer {token}
```

**Permissões:**
- **ADMIN**: pode ver qualquer aluno
- **PROFESSOR**: pode ver apenas seus alunos
- **ALUNO**: pode ver apenas ele mesmo

**Resposta 200:**
```typescript
{
  id: string
  userId: string
  professorId: string
  // ... todos os campos
}
```

**Erros:**
- `400`: ID inválido
- `403`: Sem permissão
- `404`: Aluno não encontrado

---

#### PUT /alunos/:id
Atualizar aluno

**Headers:**
```
Authorization: Bearer {token}
```

**Body (todos os campos opcionais):**
```typescript
{
  telefone?: string
  alturaCm?: number
  pesoKg?: number
  idade?: number
  cinturaCm?: number
  quadrilCm?: number
  pescocoCm?: number
  alimentos_quer_diario?: string[]
  alimentos_nao_comem?: string[]
  alergias_alimentares?: string[]
  suplementos_consumidos?: string[]
  dores_articulares?: string
  dias_treino_semana?: number
  frequencia_horarios_refeicoes?: string
}
```

**Permissões:**
- **ADMIN**: pode atualizar qualquer aluno
- **PROFESSOR**: pode atualizar apenas seus alunos
- **ALUNO**: pode atualizar apenas ele mesmo

**Resposta 200:**
```typescript
{
  // aluno atualizado completo
}
```

**Erros:**
- `400`: Dados inválidos ou nenhum campo enviado
- `403`: Sem permissão
- `404`: Aluno não encontrado

---

#### DELETE /alunos/:id
Deletar aluno

**Headers:**
```
Authorization: Bearer {admin_ou_professor_token}
```

**Permissões:**
- **ADMIN**: pode deletar qualquer aluno
- **PROFESSOR**: pode deletar apenas seus alunos
- **ALUNO**: não pode deletar (bloqueado no middleware)

**Resposta:**
- `204`: Deletado com sucesso (sem body)

**Erros:**
- `403`: Sem permissão
- `404`: Aluno não encontrado

---

## 🔄 Fluxos de Dados

### Fluxo de Autenticação

```
┌─────────────┐
│   Login     │
│  Component  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  POST /auth/login   │
│  { email, password }│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Recebe token + user│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Salva no localStorage│
│ + Context/Store     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Redireciona baseado │
│     no role         │
└─────────────────────┘
```

### Fluxo de Listagem de Alunos

```
┌─────────────────┐
│  Alunos Page    │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ useEffect(() => {    │
│   fetchAlunos()      │
│ }, [])              │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ GET /alunos          │
│ Header: Bearer token │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ API filtra por role: │
│ - Admin: todos       │
│ - Prof: só seus      │
│ - Aluno: só próprio  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Renderiza lista      │
└──────────────────────┘
```

### Fluxo de Criação de Aluno

```
┌─────────────────┐
│ Formulário      │
│ Novo Aluno      │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ Validação Frontend   │
│ (Zod/Yup/etc)       │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ POST /alunos         │
│ {                    │
│   nome, email, ...   │
│   professorId        │
│ }                    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Backend valida:      │
│ - Professor existe?  │
│ - Pode criar p/ ele? │
│ - Email único?       │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Cria User + Aluno    │
│ Retorna aluno criado │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Toast de sucesso     │
│ Redireciona ou       │
│ atualiza lista       │
└──────────────────────┘
```

## 📞 Suporte

Se tiver dúvidas sobre:
- **Endpoints**: consulte a seção "Endpoints da API"
- **Regras de negócio**: veja "Regras de Negócio"
- **Permissões**: consulte "Estados e Permissões"
- **Layout**: veja "Telas Sugeridas"

**Documentação da API completa disponível em:**
- README.md
- API-FRONTEND.md
- TESTING.md

---

## 🎉 Conclusão

Este documento fornece tudo que o desenvolvedor frontend precisa para construir uma interface completa para o sistema API Gym:

✅ **Regras de negócio claras**
✅ **Todos os endpoints documentados**
✅ **Fluxos de dados**

