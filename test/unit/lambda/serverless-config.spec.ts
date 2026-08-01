import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Testes que leem `serverless.yml` como texto (sem parser de YAML — o
 * projeto não tem um nas dependências e não vale a pena instalar um só
 * para isto). Cobrem a *configuração de infraestrutura*, não o código de
 * `src/`, por isso vivem separados de `cron-handlers.spec.ts`.
 */

const SERVERLESS_YML_PATH = path.resolve(__dirname, "../../../serverless.yml")

/**
 * Remove comentários YAML de uma linha. Um `#` só inicia comentário quando
 * está no começo da linha ou precedido de espaço — nenhum valor deste
 * arquivo contém `#` literal, então essa heurística simples é segura aqui.
 */
function stripYamlComment(line: string): string {
  return line.replace(/(^|\s)#.*$/, "$1")
}

/**
 * Extrai as linhas do bloco `provider.environment` de `serverless.yml`,
 * já sem comentários. O bloco começa na linha `  environment:` (2 espaços,
 * filha direta de `provider:`) e termina na primeira linha não-vazia cuja
 * indentação volta a 2 espaços ou menos (próxima chave de `provider`, ou
 * fim da seção).
 */
function extractProviderEnvironmentBlock(yaml: string): string[] {
  const lines = yaml.split("\n")
  const startIndex = lines.findIndex((line) => /^ {2}environment:\s*$/.test(line))
  if (startIndex === -1) {
    throw new Error(
      "Bloco 'provider.environment' não encontrado em serverless.yml — " +
        "a extração deste teste precisa ser atualizada junto com a estrutura do arquivo.",
    )
  }

  const blockLines: string[] = []
  for (let i = startIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i]
    if (rawLine.trim() === "") continue

    const indent = rawLine.match(/^ */)?.[0].length ?? 0
    if (indent <= 2) break

    blockLines.push(stripYamlComment(rawLine))
  }
  return blockLines
}

describe("serverless.yml — provider.environment", () => {
  it("não redefine ENABLE_NOTIFICATION_SCHEDULER (regressão do commit f9d905b)", () => {
    // Por que isto importa: src/env.ts dá default `true` a
    // ENABLE_NOTIFICATION_SCHEDULER, e job-registry.ts usa essa flag como
    // gate de EXECUÇÃO dos jobs (não só do agendador local em node-cron).
    // Se essa variável for fixada em 'false' aqui, dois dos três crons
    // (cronFotosSexta, cronReavaliacao) passam a retornar
    // {"status":"skipped"} em produção sem nenhum erro — o EventBridge
    // dispara, a Lambda roda e o CloudWatch registra sucesso. Esse teste
    // falha (RED) se a linha reaparecer no bloco `provider.environment`;
    // testes de `src/env.ts`/`job-registry.ts` sozinhos não bastam, porque
    // eles não leem `serverless.yml` — só o `process.env` que o teste
    // popula manualmente.
    const yaml = fs.readFileSync(SERVERLESS_YML_PATH, "utf-8")
    const environmentLines = extractProviderEnvironmentBlock(yaml)

    const activeAssignment = environmentLines.find((line) =>
      /^\s*ENABLE_NOTIFICATION_SCHEDULER\s*:/.test(line),
    )

    expect(activeAssignment).toBeUndefined()
  })
})
