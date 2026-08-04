# Plano de testes E2E — cartão 8

Validar o backend implantado na AWS de ponta a ponta, cobrindo os critérios de
aceite do cartão 8. Este documento é o plano; a execução vem depois.

**Estado atual:** `api-dev.gforcecoach.com` e `api.gforcecoach.com` no ar, com
HTTPS válido. Crons implantados mas `DISABLED`. Ambos os stages leem o **banco de
produção**.

---

## 1. O que já existe e por que não serve aqui

`pnpm test:e2e` roda 14 arquivos contra um Postgres local em Docker, cobrindo
auth, alunos, professores, finance, privacy, fotos de shape, treinos, exercícios
e atomicidade de conta.

Essa suíte **não pode ser reaproveitada** para o cartão 8, por dois motivos
estruturais:

| Motivo | Consequência |
|---|---|
| 167 chamadas a `app.inject` — requisição injetada no Fastify, nunca pela rede | Não exercita API Gateway, TLS, tamanho de payload, timeout, cold start nem variável de ambiente da Lambda |
| `test/e2e/setup.ts` executa `DROP SCHEMA public CASCADE` | Apontá-la para o banco compartilhado **apaga produção** |

O segundo item é um risco ativo hoje: `/gforce/dev/DATABASE_URL` aponta para o
banco de produção. Qualquer pessoa que rode `pnpm test:e2e` com esse valor no
`.env` destrói os dados. Ver §2.

A suíte existente continua valiosa no que ela testa — regra de negócio — e deve
seguir rodando em CI. O cartão 8 pede outra camada, que só a rede revela.

## 2. Bloqueador: dev e produção dividem o banco

O cartão 8 declara como regra: *"Nenhum dado de produção entra no ambiente dev —
seed sintético apenas"*, e pede um *"Postgres dev descartável"*. A configuração
atual faz o oposto, por decisão explícita tomada durante a implantação.

Consequência direta: **os cenários de escrita deste plano não podem ser
executados** no estado atual. Criar aluno, subir foto, disparar e-mail e rodar o
cron de limpeza escreveriam em dados reais e enviariam mensagem a pessoas reais.

Duas saídas, e a escolha define o escopo executável:

| Opção | Efeito |
|---|---|
| **A — criar banco dev descartável** (recomendada) | Plano inteiro executável; cumpre a regra do cartão; custa um banco novo no Render e apontar `/gforce/dev/DATABASE_URL` para ele |
| **B — manter banco compartilhado** | Só os cenários de leitura (Bloco 1) são executáveis; cartão 8 fecha parcialmente, com os blocos 2–5 adiados para depois do banco próprio |

Antes de qualquer execução, com a opção A: rodar `prisma migrate deploy` no banco
novo (valida as 26 migrations aplicando limpo, que é item do cartão) e depois o
seed.

## 3. Camadas

| Camada | Onde roda | O que prova | Estado |
|---|---|---|---|
| Unitária | local | lógica isolada | 159 testes ✅ |
| E2E in-process | local + Docker | regra de negócio | 14 arquivos ✅ |
| **Paridade offline** | local | Lambda ≡ servidor | `scripts/smoke-test-endpoints.mjs`, 41 rotas ✅ |
| **E2E implantado** | AWS | infraestrutura real | **este plano** |

## 4. Cenários

Papéis extraídos de `requireRole(...)` nas rotas. Três usuários de teste são
necessários: `ADMIN`, `PROFESSOR`, `ALUNO`.

### Bloco 1 — fumaça e autenticação (executável hoje, sem escrita)

| # | Cenário | Espera |
|---|---|---|
| 1.1 | `GET /health` | 200 |
| 1.2 | `GET /legal/documents/current` sem token | 200 com dados do banco |
| 1.3 | `GET /alunos` sem token | 401 |
| 1.4 | `GET /rota-inexistente` | 404 |
| 1.5 | `POST /auth/login` credencial inválida | 400/401, **sem revelar se o e-mail existe** |
| 1.6 | `POST /auth/login` credencial válida | 200 + token |
| 1.7 | `POST /auth/refresh` com o refresh recebido | 200 + novo token |
| 1.8 | `GET /auth/me` com o token | 200, papel correto |
| 1.9 | `POST /auth/logout` | 200; token seguinte recusado |
| 1.10 | Token expirado/adulterado | 401 |
| 1.11 | Usuário sem aceite legal vigente | 451 |

### Bloco 2 — autorização por papel

Para cada rota, três chamadas: papel correto, papel errado, sem token.

| # | Rota | Permitido | Espera com papel errado |
|---|---|---|---|
| 2.1 | `GET /finance/dashboard` | ADMIN | 403 para PROFESSOR/ALUNO |
| 2.2 | `POST /lead-links` | ADMIN | 403 |
| 2.3 | `GET /alunos` | ADMIN, PROFESSOR | 403 para ALUNO |
| 2.4 | `POST /treinos/plano` | PROFESSOR | 403 para ALUNO |
| 2.5 | `POST /treinos/checkins/start` | ALUNO | 403 para PROFESSOR |
| 2.6 | `GET /alunos/me` | ALUNO | comportamento definido para os demais |
| 2.7 | `PATCH /privacy/admin/requests/:id` | ADMIN | 403 |
| 2.8 | Professor A lendo aluno do professor B | — | 403 (isolamento por dono) |

### Bloco 3 — fluxo de negócio ponta a ponta (exige banco dev)

| # | Fluxo | Passos |
|---|---|---|
| 3.1 | Ciclo do aluno | criar → listar → detalhar → atualizar → mudar status |
| 3.2 | Convite e cadastro | gerar invite code (ADMIN) → registrar → login |
| 3.3 | Treino | criar molde → atribuir plano → aluno faz check-in → progresso reflete |
| 3.4 | Dieta | criar alimento → montar plano → aluno faz check-in |
| 3.5 | Financeiro | criar lançamento → editar → fechar mês → reabrir → dashboard bate |
| 3.6 | Onboarding | progresso → completar → reiniciar |
| 3.7 | Privacidade (LGPD) | preferências → solicitar exportação → admin processa |

### Bloco 4 — o que só a AWS revela

Estes são os cenários que justificam o cartão 8 existir: nenhum deles pode
falhar na camada in-process.

| # | Cenário | Por que importa | Espera |
|---|---|---|---|
| 4.1 | Upload de foto com **3,9 MB** | abaixo do teto configurado | 200, arquivo no Cloudinary |
| 4.2 | Upload com **4,1 MB** | acima do teto | rejeição com mensagem clara, **não** erro genérico do API Gateway |
| 4.3 | Upload com **6 MB** | acima do limite físico da Lambda | falha, mensagem compreensível |
| 4.4 | Download/URL assinada de arquivo | resposta binária pelo API Gateway | conteúdo íntegro |
| 4.5 | E-mail real (recuperação de senha) | SMTP a partir da Lambda | mensagem recebida |
| 4.6 | Preflight `OPTIONS` da origem do front | CORS respondido pelo Fastify, sem cabeçalho duplicado | 204 com `Access-Control-Allow-Origin` único |
| 4.7 | Requisição de origem não autorizada | `CORS_ORIGIN` aplicado | bloqueado |
| 4.8 | Rota lenta perto de 29s | teto do API Gateway | timeout tratado, não 502 cru |
| 4.9 | Cold start medido | função ociosa ≥15 min | registrar o número |
| 4.10 | Cabeçalho de IP real | `TRUST_PROXY` | rate-limit vê o IP do cliente, não o do gateway |

### Bloco 5 — crons pelo EventBridge

Critério 2 do cartão: *o EventBridge invoca o handler e o log confirma execução
completa*. Hoje os três estão `DISABLED`.

| # | Cenário | Como |
|---|---|---|
| 5.1 | Invocação manual dos três | `serverless invoke -f <nome> --stage dev`; conferir `status: "executed"` |
| 5.2 | Disparo real pelo EventBridge | habilitar temporariamente com `rate(5 minutes)` num stage de teste, confirmar no CloudWatch, reverter |
| 5.3 | Idempotência | invocar duas vezes seguidas; a segunda não duplica notificação |
| 5.4 | Falha propaga | forçar erro; invocação marcada como falha nas métricas, não sucesso silencioso |

**Atenção:** 5.2 só com banco dev próprio. Com o banco compartilhado, habilitar o
agendamento envia mensagem real a aluno real.

### Bloco 6 — medições (critérios 3 e 4)

| # | Medição | Método | Critério |
|---|---|---|---|
| 6.1 | p95 warm | 50 requisições sequenciais a uma rota que consulta o banco, descartando a primeira | documentar o número |
| 6.2 | Cold start | invocar após ≥15 min de ociosidade, 5 amostras | ~1–2s esperado |
| 6.3 | Latência Lambda→Render por query | comparar rota com 1 query vs rota com N | isolar o custo de rede |
| 6.4 | Limite de conexões | 30 requisições concorrentes a rota que consulta o banco | **zero** "too many connections" |

6.4 é o teste que valida a decisão de `connection_limit=3`. É também o único
deste bloco que pode derrubar produção se rodado contra o banco compartilhado —
executar somente com banco dev próprio.

## 5. Ferramenta

Estender `scripts/smoke-test-endpoints.mjs`, que já resolve autenticação por
papel, reuso de token e comparação entre ambientes. Falta:

- alvo configurável por URL (`--target https://api-dev.gforcecoach.com`)
- cenários de escrita, com limpeza ao final
- upload multipart com arquivos de tamanho controlado
- medição de latência com percentis
- modo concorrente para 6.4

Alternativa descartada: reaproveitar `test/e2e/` apontando para a rede. Exigiria
reescrever 167 chamadas `app.inject` e remover o `DROP SCHEMA` do setup —
mais trabalho que estender o script, e deixaria a suíte local perigosa.

## 6. Ordem de execução

1. **Decidir §2.** Sem isso, só o Bloco 1 é executável.
2. Com banco dev: `prisma migrate deploy` + seed sintético; apontar
   `/gforce/dev/DATABASE_URL`; redeploy.
3. Bloco 1 (fumaça) — porta de entrada; se falhar, parar.
4. Bloco 2 (autorização) — barato e alto valor.
5. Bloco 4 (só-AWS) — onde estão as surpresas.
6. Bloco 3 (negócio) — o mais longo.
7. Bloco 5 (crons) e Bloco 6 (medições).
8. Deixar rodando dias antes de liberar o cartão 11, como o cartão pede.

## 7. Fora de escopo

Frontend (cartão 9) — este plano valida a API por HTTP; a validação pela
interface depende do front apontado para o ambiente novo. Testes de carga além do
6.4. Produção: nenhum cenário deste plano roda contra `api.gforcecoach.com`.
