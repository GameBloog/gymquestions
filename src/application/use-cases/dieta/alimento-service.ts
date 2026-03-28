import { OrigemAlimento } from "@prisma/client"
import { env } from "@/env"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"

interface AuthContext {
  userId: string
  role: UserRole
}

export interface AlimentoExterno {
  externalId: string
  nome: string
  descricao?: string
  calorias100g: number
  proteinas100g: number
  carboidratos100g: number
  gorduras100g: number
  fibras100g?: number
  source: "USDA" | "TACO"
}

interface ListAlimentosInput {
  q?: string
}

interface SearchExternalInput {
  q: string
  source?: "USDA" | "TACO" | "ALL"
  limit?: number
}

interface ImportAlimentoInput {
  externalId: string
  nome: string
  descricao?: string
  calorias100g: number
  proteinas100g: number
  carboidratos100g: number
  gorduras100g: number
  fibras100g?: number
  source: "USDA" | "TACO"
}

interface CreateAlimentoInput {
  nome: string
  descricao?: string
  calorias100g: number
  proteinas100g: number
  carboidratos100g: number
  gorduras100g: number
  fibras100g?: number
}

const fallbackFoods: AlimentoExterno[] = [
  {
    externalId: "fallback-arroz",
    nome: "Arroz branco cozido",
    calorias100g: 128,
    proteinas100g: 2.5,
    carboidratos100g: 28.1,
    gorduras100g: 0.2,
    fibras100g: 1.6,
    source: "TACO",
  },
  {
    externalId: "fallback-frango",
    nome: "Frango peito grelhado",
    calorias100g: 159,
    proteinas100g: 32,
    carboidratos100g: 0,
    gorduras100g: 2.5,
    fibras100g: 0,
    source: "TACO",
  },
  {
    externalId: "fallback-banana",
    nome: "Banana prata",
    calorias100g: 98,
    proteinas100g: 1.3,
    carboidratos100g: 26,
    gorduras100g: 0.1,
    fibras100g: 2,
    source: "TACO",
  },
  {
    externalId: "fallback-ovo",
    nome: "Ovo cozido",
    calorias100g: 146,
    proteinas100g: 13.3,
    carboidratos100g: 0.6,
    gorduras100g: 9.5,
    fibras100g: 0,
    source: "USDA",
  },
  {
    externalId: "fallback-pao-frances",
    nome: "Pão francês",
    calorias100g: 300,
    proteinas100g: 8.0,
    carboidratos100g: 58.6,
    gorduras100g: 3.1,
    fibras100g: 2.3,
    source: "TACO",
  },
  {
    externalId: "fallback-aveia",
    nome: "Aveia em flocos",
    calorias100g: 394,
    proteinas100g: 13.9,
    carboidratos100g: 66.6,
    gorduras100g: 8.5,
    fibras100g: 9.1,
    source: "TACO",
  },
]

const round2 = (value: number) => Math.round(value * 100) / 100
const EXTERNAL_FETCH_TIMEOUT_MS = 3500

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

export class AlimentoService {
  async listAlimentos(auth: AuthContext, input: ListAlimentosInput) {
    return prisma.alimento.findMany({
      where: {
        AND: [
          input.q
            ? {
                nome: {
                  contains: input.q,
                  mode: "insensitive",
                },
              }
            : {},
          auth.role === UserRole.ADMIN
            ? {}
            : {
                OR: [
                  { origem: OrigemAlimento.SISTEMA },
                  { origem: OrigemAlimento.EXTERNO },
                  { origem: OrigemAlimento.PROFESSOR },
                ],
              },
        ],
      },
      orderBy: [{ nome: "asc" }],
    })
  }

  async searchExternal(input: SearchExternalInput): Promise<AlimentoExterno[]> {
    const q = input.q.trim()
    const limit = input.limit ?? 20
    if (!q) {
      return fallbackFoods.slice(0, limit)
    }

    const source = input.source || "ALL"

    const promises: Promise<AlimentoExterno[]>[] = []

    if (source === "ALL" || source === "USDA") {
      promises.push(this.searchUsda(q, limit))
    }
    if (source === "ALL" || source === "TACO") {
      promises.push(this.searchTaco(q, limit))
    }

    const results = await Promise.allSettled(promises)
    const merged: AlimentoExterno[] = []

    for (const result of results) {
      if (result.status === "fulfilled") {
        merged.push(...result.value)
      }
    }

    if (merged.length > 0) {
      return merged.slice(0, limit)
    }

    const normalizedQuery = normalizeSearch(q)
    return fallbackFoods
      .filter((food) => normalizeSearch(food.nome).includes(normalizedQuery))
      .slice(0, limit)
  }

  async createProfessorAlimento(auth: AuthContext, input: CreateAlimentoInput) {
    const professorId = await this.resolveProfessorId(auth)
    const isAdmin = auth.role === UserRole.ADMIN

    if (!isAdmin && !professorId) {
      throw new AppError("Professor não encontrado para criar alimento", 404)
    }

    const macrosTotal =
      input.proteinas100g + input.carboidratos100g + input.gorduras100g
    if (macrosTotal > 100.5) {
      throw new AppError(
        "A soma de proteínas, carboidratos e gorduras deve ser <= 100g por 100g",
        400,
      )
    }

    return prisma.alimento.create({
      data: {
        nome: input.nome,
        descricao: input.descricao,
        origem: isAdmin ? OrigemAlimento.SISTEMA : OrigemAlimento.PROFESSOR,
        calorias100g: round2(input.calorias100g),
        proteinas100g: round2(input.proteinas100g),
        carboidratos100g: round2(input.carboidratos100g),
        gorduras100g: round2(input.gorduras100g),
        fibras100g: input.fibras100g !== undefined ? round2(input.fibras100g) : null,
        professorId: isAdmin ? null : professorId,
      },
    })
  }

  async importExternal(auth: AuthContext, input: ImportAlimentoInput) {
    const professorId = await this.resolveProfessorId(auth)

    const existing = await prisma.alimento.findFirst({
      where: {
        externalId: input.externalId,
        fonteExterna: input.source,
      },
    })

    if (existing) {
      return existing
    }

    return prisma.alimento.create({
      data: {
        nome: input.nome,
        descricao: input.descricao,
        origem: OrigemAlimento.EXTERNO,
        externalId: input.externalId,
        fonteExterna: input.source,
        calorias100g: round2(input.calorias100g),
        proteinas100g: round2(input.proteinas100g),
        carboidratos100g: round2(input.carboidratos100g),
        gorduras100g: round2(input.gorduras100g),
        fibras100g: input.fibras100g !== undefined ? round2(input.fibras100g) : null,
        professorId: professorId ?? null,
      },
    })
  }

  private async searchUsda(q: string, limit: number): Promise<AlimentoExterno[]> {
    if (!env.USDA_API_KEY) {
      return []
    }

    try {
      const searchUrl = new URL(`${env.USDA_API_BASE_URL}/foods/search`)
      searchUrl.searchParams.set("query", q)
      searchUrl.searchParams.set("pageSize", String(Math.min(limit, 25)))
      searchUrl.searchParams.set("api_key", env.USDA_API_KEY)

      const response = await fetch(searchUrl.toString(), {
        signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = (await response.json()) as {
        foods?: Array<{
          fdcId: number
          description?: string
          foodNutrients?: Array<{
            nutrientName?: string
            nutrientNumber?: string
            value?: number
          }>
        }>
      }

      const foods = payload.foods || []

      return foods
        .map((item) => {
          const getNutrient = (codes: string[], names: string[]) => {
            const nutrient = (item.foodNutrients || []).find((n) => {
              const code = (n.nutrientNumber || "").trim()
              const name = (n.nutrientName || "").toLowerCase()
              return (
                codes.includes(code) ||
                names.some((expected) => name.includes(expected))
              )
            })
            return nutrient?.value ?? 0
          }

          const calorias = getNutrient(["208", "1008"], ["energy"])
          const proteinas = getNutrient(["203"], ["protein"])
          const carboidratos = getNutrient(
            ["205"],
            ["carbohydrate", "carbohydrate, by difference"],
          )
          const gorduras = getNutrient(["204"], ["total lipid", "fat"])
          const fibras = getNutrient(["291"], ["fiber", "dietary fiber"])

          return {
            externalId: String(item.fdcId),
            nome: item.description?.trim() || "Alimento sem descrição",
            calorias100g: round2(calorias),
            proteinas100g: round2(proteinas),
            carboidratos100g: round2(carboidratos),
            gorduras100g: round2(gorduras),
            fibras100g: round2(fibras),
            source: "USDA" as const,
          }
        })
        .filter((item) => item.calorias100g > 0 || item.proteinas100g > 0 || item.carboidratos100g > 0 || item.gorduras100g > 0)
    } catch (error) {
      console.error("[dieta] Falha na busca USDA:", error)
      return []
    }
  }

  private async searchTaco(q: string, limit: number): Promise<AlimentoExterno[]> {
    if (!env.TACO_API_BASE_URL) {
      return []
    }

    try {
      const response = await fetch(env.TACO_API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query SearchFoods($name: String!) {
              getFoodByName(name: $name) {
                id
                name
                nutrients {
                  kcal
                  protein
                  carbohydrates
                  lipids
                  dietaryFiber
                }
              }
            }
          `,
          variables: {
            name: q,
          },
        }),
        signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = (await response.json()) as {
        data?: {
          getFoodByName?: unknown[]
        }
      }
      const list = Array.isArray(payload.data?.getFoodByName)
        ? payload.data.getFoodByName
        : []

      return list
        .map((item) => this.mapTacoGraphqlFood(item))
        .filter((item): item is AlimentoExterno => !!item)
        .filter((item) => normalizeSearch(item.nome).includes(normalizeSearch(q)))
        .slice(0, limit)
    } catch (error) {
      console.error("[dieta] Falha na busca TACO:", error)
      return []
    }
  }

  private mapTacoGraphqlFood(item: unknown): AlimentoExterno | null {
    if (!item || typeof item !== "object") {
      return null
    }

    const value = item as Record<string, unknown>
    const externalId = String(value.id ?? "").trim()
    const nome = String(value.name ?? "").trim()

    if (!externalId || !nome) {
      return null
    }

    const nutrients =
      value.nutrients && typeof value.nutrients === "object"
        ? (value.nutrients as Record<string, unknown>)
        : {}

    const calorias = this.toNumber(nutrients.kcal)
    const proteinas = this.toNumber(nutrients.protein)
    const carboidratos = this.toNumber(nutrients.carbohydrates)
    const gorduras = this.toNumber(nutrients.lipids)
    const fibras = this.toNumber(nutrients.dietaryFiber)

    return {
      externalId,
      nome,
      calorias100g: round2(calorias),
      proteinas100g: round2(proteinas),
      carboidratos100g: round2(carboidratos),
      gorduras100g: round2(gorduras),
      fibras100g: round2(fibras),
      source: "TACO",
    }
  }

  private toNumber(value: unknown) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0
    }
    if (typeof value === "string") {
      const normalized = value.replace(",", ".").trim()
      const parsed = Number(normalized)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  private async resolveProfessorId(auth: AuthContext): Promise<string | null> {
    if (auth.role === UserRole.PROFESSOR) {
      const professor = await prisma.professor.findUnique({
        where: { userId: auth.userId },
      })

      if (!professor) {
        throw new AppError("Professor não encontrado", 404)
      }

      return professor.id
    }

    if (auth.role === UserRole.ALUNO) {
      const aluno = await prisma.aluno.findUnique({
        where: { userId: auth.userId },
      })

      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }

      return aluno.professorId
    }

    return null
  }
}
