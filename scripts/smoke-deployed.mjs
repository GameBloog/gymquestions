/**
 * Smoke test de um ambiente JA IMPLANTADO, pela rede.
 *
 * Diferente de scripts/smoke-test-endpoints.mjs, que compara `pnpm dev` com
 * `serverless offline` na mesma maquina, este aqui bate num alvo real por HTTPS
 * e exercita o que so a infraestrutura revela: TLS, API Gateway, CORS, cold
 * start e latencia atravessando a internet ate o banco.
 *
 * Nao escreve nada. Nenhum cenario cria, altera ou apaga registro, e nenhum
 * dispara e-mail - por isso pode rodar contra producao sem risco. Os cenarios
 * de escrita do plano do cartao 8 dependem de um banco dev descartavel e
 * ficam fora daqui de proposito.
 *
 * Uso:
 *   node scripts/smoke-deployed.mjs --target https://api-dev.gforcecoach.com
 *   node scripts/smoke-deployed.mjs --target https://api.gforcecoach.com \
 *        --origin https://www.gforcecoach.com --amostras 30
 *
 * Credenciais sao opcionais. Com elas, o bloco autenticado (tambem so de
 * leitura) roda tambem:
 *   ... --email professor@exemplo.com --senha '...'
 *
 * Sai com codigo != 0 se qualquer verificacao falhar, para servir de porta
 * de entrada em pipeline.
 */

const args = process.argv.slice(2)

function arg(nome, padrao = null) {
  const i = args.indexOf(`--${nome}`)
  return i !== -1 && args[i + 1] ? args[i + 1] : padrao
}

const TARGET = arg("target")
const ORIGIN = arg("origin", "https://www.gforcecoach.com")
const AMOSTRAS = Number(arg("amostras", "20"))
const EMAIL = arg("email")
const SENHA = arg("senha")

if (!TARGET) {
  console.error("Faltou --target. Ex.: --target https://api-dev.gforcecoach.com")
  process.exit(2)
}

const resultados = []

function registrar(nome, ok, detalhe) {
  resultados.push({ nome, ok, detalhe })
  console.log(`${ok ? "  ok  " : " FALHA"} │ ${nome}${detalhe ? ` — ${detalhe}` : ""}`)
}

async function chamar(caminho, opcoes = {}) {
  const inicio = performance.now()
  const resposta = await fetch(`${TARGET}${caminho}`, opcoes)
  const ms = performance.now() - inicio
  const texto = await resposta.text()

  let json = null
  try {
    json = JSON.parse(texto)
  } catch {
    // resposta nao-JSON e informacao valida por si so
  }

  return { status: resposta.status, headers: resposta.headers, json, texto, ms }
}

function esperarStatus(nome, obtido, esperados, extra) {
  const lista = Array.isArray(esperados) ? esperados : [esperados]
  registrar(
    nome,
    lista.includes(obtido),
    `status ${obtido}${lista.includes(obtido) ? "" : ` (esperado ${lista.join(" ou ")})`}${extra ? `, ${extra}` : ""}`,
  )
}

// ------------------------------------------------------ bloco 1: sem token
async function blocoPublico() {
  console.log("\n▸ Fumaça e autenticação (sem credencial)")

  const saude = await chamar("/health")
  esperarStatus("GET /health", saude.status, 200, `${Math.round(saude.ms)}ms`)

  // Primeira chamada do processo: e a que paga o cold start, se houver.
  console.log(`         └ primeira requisição: ${Math.round(saude.ms)}ms (inclui cold start, se houve)`)

  const legal = await chamar("/legal/documents/current")
  esperarStatus("GET /legal/documents/current (público, consulta o banco)", legal.status, 200)

  const semToken = await chamar("/alunos")
  esperarStatus("GET /alunos sem token → 401", semToken.status, 401)

  const inexistente = await chamar("/rota-que-nao-existe-mesmo")
  esperarStatus("GET rota inexistente → 404", inexistente.status, 404)

  const login = await chamar("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "nao-existe-mesmo@exemplo-invalido.com",
      password: "senha-errada",
    }),
  })
  esperarStatus("POST /auth/login inválido → 400/401", login.status, [400, 401])

  // Enumeracao de usuario: a mensagem nao pode dizer se o e-mail existe.
  const mensagem = JSON.stringify(login.json ?? login.texto).toLowerCase()
  const vaza = ["não encontrado", "nao encontrado", "não existe", "not found"].some(
    (t) => mensagem.includes(t),
  )
  registrar(
    "login inválido não revela se o e-mail existe",
    !vaza,
    vaza ? "a mensagem sugere existência da conta" : undefined,
  )
}

// --------------------------------------------------------------- bloco CORS
async function blocoCors() {
  console.log("\n▸ CORS")

  const preflight = await chamar("/alunos", {
    method: "OPTIONS",
    headers: {
      Origin: ORIGIN,
      "Access-Control-Request-Method": "GET",
    },
  })
  esperarStatus(`preflight de ${ORIGIN}`, preflight.status, [200, 204])

  // Cabecalho duplicado quebra o navegador silenciosamente. Acontece quando o
  // CORS do API Gateway e o do Fastify respondem os dois - por isso o
  // serverless.yml mantem httpApi.cors: false.
  const permitido = preflight.headers.get("access-control-allow-origin")
  registrar(
    "Access-Control-Allow-Origin único e correto",
    permitido === ORIGIN,
    `recebido: ${permitido ?? "(ausente)"}`,
  )

  const naoAutorizada = await chamar("/alunos", {
    method: "OPTIONS",
    headers: {
      Origin: "https://origem-nao-autorizada.example",
      "Access-Control-Request-Method": "GET",
    },
  })
  const liberouEstranho = naoAutorizada.headers.get("access-control-allow-origin")
  registrar(
    "origem não autorizada é recusada",
    liberouEstranho !== "https://origem-nao-autorizada.example",
    liberouEstranho ? `liberou: ${liberouEstranho}` : undefined,
  )
}

// -------------------------------------------------- bloco autenticado (opt)
async function blocoAutenticado() {
  if (!EMAIL || !SENHA) {
    console.log("\n▸ Autenticado — pulado (sem --email/--senha)")
    return
  }

  console.log("\n▸ Autenticado (somente leitura)")

  const login = await chamar("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: SENHA }),
  })
  esperarStatus("POST /auth/login válido", login.status, 200)

  const token = login.json?.token ?? login.json?.accessToken
  if (!token) {
    registrar("token presente na resposta de login", false, "não veio token")
    return
  }
  registrar("token presente na resposta de login", true)

  const eu = await chamar("/auth/me", {
    headers: { authorization: `Bearer ${token}` },
  })
  esperarStatus("GET /auth/me com token", eu.status, 200, `papel: ${eu.json?.role ?? "?"}`)

  const adulterado = await chamar("/auth/me", {
    headers: { authorization: `Bearer ${token.slice(0, -3)}xyz` },
  })
  esperarStatus("GET /auth/me com token adulterado → 401", adulterado.status, 401)
}

// ------------------------------------------------------------- latência
async function blocoLatencia() {
  console.log(`\n▸ Latência (${AMOSTRAS} amostras, rota que consulta o banco)`)

  const medidas = []
  for (let i = 0; i < AMOSTRAS; i++) {
    const r = await chamar("/legal/documents/current")
    // A primeira e descartada: mede cold start, nao regime permanente.
    if (i > 0) medidas.push(r.ms)
  }

  if (medidas.length === 0) {
    registrar("amostras suficientes para medir", false, "aumente --amostras")
    return
  }

  medidas.sort((a, b) => a - b)
  const p = (q) => Math.round(medidas[Math.min(medidas.length - 1, Math.floor(medidas.length * q))])

  console.log(
    `         p50 ${p(0.5)}ms │ p95 ${p(0.95)}ms │ min ${Math.round(medidas[0])}ms │ max ${Math.round(medidas.at(-1))}ms`,
  )
  // Sem limiar automatico: o criterio 3 do cartao 8 pede o numero documentado,
  // e o que e "aceitavel pro produto" e decisao de quem le, nao do script.
  registrar("p95 medido e registrado acima", true, `p95 = ${p(0.95)}ms`)
}

// ---------------------------------------------------------------- execução
console.log(`Alvo: ${TARGET}`)

await blocoPublico()
await blocoCors()
await blocoAutenticado()
await blocoLatencia()

const falhas = resultados.filter((r) => !r.ok)
console.log(
  `\n${resultados.length - falhas.length}/${resultados.length} verificações passaram`,
)

if (falhas.length > 0) {
  console.log("\nFalhas:")
  falhas.forEach((f) => console.log(`  • ${f.nome} — ${f.detalhe ?? ""}`))
  process.exit(1)
}
