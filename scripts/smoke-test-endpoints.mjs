/**
 * Smoke test de paridade: dispara todas as rotas contra os dois caminhos —
 * o servidor de sempre (`pnpm dev`) e o caminho da Lambda (`serverless offline`)
 * — e compara as respostas.
 *
 * O que ele prova: rodar como Lambda nao mudou o comportamento da API. Nao e
 * teste de regra de negocio (isso e a suite do Vitest); e teste de equivalencia
 * entre dois modos de execucao. Por isso o criterio de sucesso e "os dois
 * responderam a mesma coisa", nao "respondeu 200".
 *
 * Autentica uma vez por papel e reusa o token em todas as chamadas.
 *
 * Uso:
 *   node scripts/smoke-test-endpoints.mjs
 *   node scripts/smoke-test-endpoints.mjs --only-lambda   # so a porta 3000
 *   BASE_LAMBDA=http://localhost:3000 BASE_DEV=http://localhost:3333 node ...
 */
import { readFileSync } from "node:fs"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const BASE_LAMBDA = process.env.BASE_LAMBDA ?? "http://localhost:3000"
const BASE_DEV = process.env.BASE_DEV ?? "http://localhost:3333"
const ONLY_LAMBDA = process.argv.includes("--only-lambda")

// ---------------------------------------------------------------- env local
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      let v = l.slice(i + 1).trim()
      if (!v.startsWith('"') && !v.startsWith("'")) v = v.split(/\s+#/)[0].trim()
      return [l.slice(0, i).trim(), v.replace(/^["']|["']$/g, "")]
    }),
)

// --------------------------------------------------------------- tokens
// O middleware nao so valida a assinatura: ele busca o usuario no banco. Token
// sintetico de usuario inexistente da 401, entao pegamos ids reais do banco local.
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } })

const usuariosDoTeste = []

async function tokenPara(role) {
  const user = await prisma.user.findFirst({ where: { role }, select: { id: true, email: true } })
  if (!user) return null
  usuariosDoTeste.push(user.id)
  return jwt.sign({ userId: user.id, email: user.email, role }, env.JWT_SECRET, {
    expiresIn: "1h",
  })
}

/**
 * O middleware barra com 451 quem nao aceitou os documentos legais atuais.
 * Sem isso o teste so exercita o portao da LGPD e fica cego para o resto.
 * Idempotente e restrito ao banco local de desenvolvimento.
 */
async function garantirAceiteLegal() {
  const atuais = await prisma.legalDocumentVersion.findMany({ where: { isCurrent: true } })
  let criados = 0

  for (const userId of [...new Set(usuariosDoTeste)]) {
    for (const doc of atuais) {
      const r = await prisma.userLegalAcceptance.upsert({
        where: { userId_documentVersionId: { userId, documentVersionId: doc.id } },
        update: {},
        create: {
          userId,
          documentVersionId: doc.id,
          documentType: doc.documentType,
          version: doc.version,
        },
      })
      if (r) criados += 1
    }
  }

  console.log(`aceite legal garantido: ${criados} registro(s) para ${new Set(usuariosDoTeste).size} usuario(s), ${atuais.length} documento(s) vigente(s)`)
}

// Timestamps e duracoes mudam entre duas chamadas por definicao — compara-los
// acusaria diferenca em toda resposta com data, escondendo divergencia real.
const normalizar = (texto) =>
  texto
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "<TS>")
    .replace(/"uptime":[\d.]+/g, '"uptime":<N>')

// -------------------------------------------------------------- ids reais
// Rotas com :param usam um id que existe, senao todo teste vira 404 e a
// comparacao fica cega para diferencas reais de comportamento.
async function idsReais() {
  const [aluno, foto, entry, lead] = await Promise.all([
    prisma.aluno.findFirst({ select: { id: true } }),
    prisma.fotoShape.findFirst({ select: { id: true } }).catch(() => null),
    prisma.financeEntry?.findFirst({ select: { id: true } }).catch(() => null) ?? null,
    prisma.leadLink?.findFirst({ select: { id: true } }).catch(() => null) ?? null,
  ])
  return {
    alunoId: aluno?.id ?? "00000000-0000-0000-0000-000000000000",
    fotoId: foto?.id ?? "00000000-0000-0000-0000-000000000000",
    entryId: entry?.id ?? "00000000-0000-0000-0000-000000000000",
    leadId: lead?.id ?? "00000000-0000-0000-0000-000000000000",
  }
}

// ---------------------------------------------------------------- rotas
// papel: qual token usar. `null` = sem token (rota publica ou teste de 401).
function montarRotas(ids) {
  return [
    // publicas
    ["GET", "/health", null],
    ["GET", "/legal/documents/current", null],
    ["GET", "/rota-que-nao-existe", null],
    ["POST", "/auth/login", null, { email: "inexistente@teste.com", senha: "errada" }],
    ["POST", "/auth/refresh", null, {}],

    // autenticacao exigida — sem token, para conferir o 401 nos dois
    ["GET", "/alunos", null],
    ["GET", "/finance/dashboard", null],

    // leitura como professor
    ["GET", "/alunos", "PROFESSOR"],
    ["GET", `/alunos/${ids.alunoId}`, "PROFESSOR"],
    ["GET", `/alunos/${ids.alunoId}/historico`, "PROFESSOR"],
    ["GET", "/exercicios", "PROFESSOR"],
    ["GET", "/exercicios/grupamentos", "PROFESSOR"],
    ["GET", "/dietas/alimentos?busca=arroz", "PROFESSOR"],
    ["GET", `/dietas/aluno/${ids.alunoId}/ativo`, "PROFESSOR"],
    ["GET", `/treinos/aluno/${ids.alunoId}/ativo`, "PROFESSOR"],
    ["GET", `/treinos/aluno/${ids.alunoId}/checkins`, "PROFESSOR"],
    ["GET", `/treinos/aluno/${ids.alunoId}/progresso`, "PROFESSOR"],
    ["GET", `/treinos/aluno/${ids.alunoId}/timeline`, "PROFESSOR"],
    ["GET", `/fotos-shape/aluno/${ids.alunoId}`, "PROFESSOR"],
    ["GET", `/arquivos-aluno/aluno/${ids.alunoId}`, "PROFESSOR"],
    ["GET", "/finance/dashboard", "PROFESSOR"],
    ["GET", "/finance/entries", "PROFESSOR"],
    ["GET", "/finance/renewals", "PROFESSOR"],
    ["GET", "/lead-links", "PROFESSOR"],
    ["GET", "/onboarding", "PROFESSOR"],
    ["GET", "/privacy/preferences", "PROFESSOR"],
    ["GET", "/privacy/requests", "PROFESSOR"],
    ["GET", "/privacy/export", "PROFESSOR"],

    // leitura como aluno
    ["GET", "/alunos/me", "ALUNO"],
    ["GET", "/onboarding", "ALUNO"],
    ["GET", "/privacy/preferences", "ALUNO"],

    // escrita com corpo invalido: exercita validacao, nao cria dado
    ["POST", "/finance/entries", "PROFESSOR", {}],
    ["POST", "/lead-links", "PROFESSOR", {}],
    ["POST", "/privacy/requests", "PROFESSOR", {}],
    ["POST", "/onboarding/progress", "PROFESSOR", {}],
    ["PUT", "/privacy/preferences", "PROFESSOR", {}],
    ["PATCH", `/finance/entries/${ids.entryId}`, "PROFESSOR", {}],
    ["PATCH", `/lead-links/${ids.leadId}`, "PROFESSOR", {}],
    ["PUT", `/alunos/${ids.alunoId}`, "PROFESSOR", {}],

    // autorizacao: aluno tentando rota de professor
    ["GET", "/finance/dashboard", "ALUNO"],
    ["GET", "/lead-links", "ALUNO"],
  ]
}

// -------------------------------------------------------------- execucao
async function chamar(base, metodo, caminho, token, corpo) {
  const inicio = Date.now()
  try {
    const res = await fetch(base + caminho, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
      signal: AbortSignal.timeout(20000),
    })
    const texto = await res.text()
    return { status: res.status, corpo: texto.slice(0, 400), ms: Date.now() - inicio }
  } catch (e) {
    return { status: "ERRO", corpo: String(e.message).slice(0, 120), ms: Date.now() - inicio }
  }
}

const main = async () => {
  const tokens = {
    PROFESSOR: (await tokenPara("PROFESSOR")) ?? (await tokenPara("ADMIN")),
    ALUNO: await tokenPara("ALUNO"),
    ADMIN: await tokenPara("ADMIN"),
  }

  for (const [papel, t] of Object.entries(tokens)) {
    if (!t) console.log(`AVISO: nenhum usuario com papel ${papel} no banco local — rotas desse papel darao 401`)
  }

  await garantirAceiteLegal()
  const rotas = montarRotas(await idsReais())
  await prisma.$disconnect()

  console.log(`\nrotas: ${rotas.length} | lambda: ${BASE_LAMBDA}${ONLY_LAMBDA ? "" : ` | dev: ${BASE_DEV}`}\n`)

  const divergentes = []
  const erros = []

  for (const [metodo, caminho, papel, corpo] of rotas) {
    const token = papel ? tokens[papel] : null
    const a = await chamar(BASE_LAMBDA, metodo, caminho, token, corpo)
    const b = ONLY_LAMBDA ? a : await chamar(BASE_DEV, metodo, caminho, token, corpo)

    // /health difere de proposito: em producao o app omite uptime/environment,
    // e o caminho da Lambda roda com NODE_ENV=production.
    const corpoIgual =
      caminho === "/health" || normalizar(a.corpo) === normalizar(b.corpo)
    const igual = a.status === b.status && corpoIgual

    if (a.status === "ERRO" || b.status === "ERRO") erros.push([metodo, caminho, papel, a, b])
    else if (!igual) divergentes.push([metodo, caminho, papel, a, b])

    const marca = a.status === "ERRO" || b.status === "ERRO" ? "ERRO " : igual ? "  ok " : "DIFF "
    const rotulo = `${metodo} ${caminho}`.slice(0, 52)
    console.log(
      `${marca}${rotulo.padEnd(53)} ${String(a.status).padStart(4)}${ONLY_LAMBDA ? "" : ` ${String(b.status).padStart(4)}`}  ${String(a.ms).padStart(5)}ms`,
    )
  }

  console.log(`\n${"=".repeat(72)}`)
  console.log(`total: ${rotas.length} | divergentes: ${divergentes.length} | erros: ${erros.length}`)

  for (const [metodo, caminho, papel, a, b] of [...divergentes, ...erros]) {
    console.log(`\n--- ${metodo} ${caminho} (${papel ?? "sem token"})`)
    console.log(`  lambda ${a.status}: ${a.corpo}`)
    console.log(`  dev    ${b.status}: ${b.corpo}`)
  }

  process.exit(divergentes.length + erros.length > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error("falhou:", e.message)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
