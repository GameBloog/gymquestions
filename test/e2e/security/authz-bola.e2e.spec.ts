import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../../src/app"
import {
  cleanDatabase,
  createTestAluno,
  createTestProfessor,
  generateTestToken,
  teardownTestDatabase,
} from "../../helpers/test-helpers"
import { UserRole } from "../../../src/domain/entities/user"

/**
 * SEC AUDIT — US1: regressão de autorização em nível de objeto (IDOR/BOLA).
 *
 * Contrato aceito (Constituição IV): um ALUNO nunca acessa recursos de outro
 * aluno, e um PROFESSOR nunca acessa alunos que não são seus. Cada cenário
 * espera 403/404 — qualquer 200 com dados é uma regressão de segurança.
 */
describe("SEC US1 — IDOR/BOLA (posse de recurso)", () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
    await app.close()
  })

  async function twoStudentsDifferentProfessors() {
    const { professor: profA } = await createTestProfessor()
    const { professor: profB, user: profBUser } = await createTestProfessor()
    const victim = await createTestAluno(profA.id) // aluno alvo
    const attacker = await createTestAluno(profB.id) // aluno atacante
    return { victim, attacker, profA, profB, profBUser }
  }

  function alunoToken(user: { id: string; email: string }) {
    return generateTestToken({
      userId: user.id,
      email: user.email,
      role: UserRole.ALUNO,
    })
  }

  const studentScopedReads = (victimAlunoId: string) => [
    `/treinos/aluno/${victimAlunoId}/ativo`,
    `/dietas/aluno/${victimAlunoId}/ativo`,
    `/fotos-shape/aluno/${victimAlunoId}`,
    `/arquivos-aluno/aluno/${victimAlunoId}`,
    `/alunos/${victimAlunoId}/historico`,
    `/alunos/${victimAlunoId}`,
  ]

  it("ALUNO não acessa nenhum recurso de outro ALUNO (espera 403/404)", async () => {
    const { victim, attacker } = await twoStudentsDifferentProfessors()
    const token = alunoToken(attacker.user)

    for (const url of studentScopedReads(victim.aluno.id)) {
      const res = await app.inject({
        method: "GET",
        url,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(
        [403, 404],
        `${url} deveria negar acesso cruzado, recebeu ${res.statusCode}`,
      ).toContain(res.statusCode)
    }
  })

  it("PROFESSOR não acessa aluno de outro professor (espera 403/404)", async () => {
    const { victim, profBUser } = await twoStudentsDifferentProfessors()
    const token = generateTestToken({
      userId: profBUser.id,
      email: profBUser.email,
      role: UserRole.PROFESSOR,
    })

    for (const url of studentScopedReads(victim.aluno.id)) {
      const res = await app.inject({
        method: "GET",
        url,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(
        [403, 404],
        `${url} deveria negar acesso de professor não-dono, recebeu ${res.statusCode}`,
      ).toContain(res.statusCode)
    }
  })

  it("ALUNO acessa os PRÓPRIOS recursos (não deve ser 403)", async () => {
    const { attacker } = await twoStudentsDifferentProfessors()
    const token = alunoToken(attacker.user)

    const res = await app.inject({
      method: "GET",
      url: `/alunos/${attacker.aluno.id}/historico`,
      headers: { authorization: `Bearer ${token}` },
    })
    // Pode ser 200 (lista vazia) — o que importa é NÃO ser bloqueado por posse.
    expect(res.statusCode).not.toBe(403)
  })
})
