import { beforeEach, describe, expect, it, vi } from "vitest"

const importService = async () => {
  const module = await import(
    "../../../../src/application/use-cases/dieta/alimento-service"
  )
  return module.AlimentoService
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })

describe("AlimentoService - TACO GraphQL", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.resetModules()

    process.env.TACO_API_BASE_URL = "http://localhost:4000/graphql"
    process.env.USDA_API_KEY = ""
    process.env.USDA_API_BASE_URL = "https://api.nal.usda.gov/fdc/v1"
  })

  it("should fetch and map TACO GraphQL data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          getFoodByName: [
            {
              id: 100,
              name: "Pão francês",
              nutrients: {
                kcal: 300,
                protein: 8,
                carbohydrates: 58.6,
                lipids: 3.1,
                dietaryFiber: 2.3,
              },
            },
          ],
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const AlimentoService = await importService()
    const service = new AlimentoService()

    const result = await service.searchExternal({
      q: "pao",
      source: "TACO",
      limit: 20,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("http://localhost:4000/graphql")
    expect(options.method).toBe("POST")
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
    })

    const body = JSON.parse(String(options.body)) as {
      query: string
      variables: { name: string }
    }
    expect(body.query).toContain("getFoodByName")
    expect(body.variables).toEqual({ name: "pao" })

    expect(result).toEqual([
      {
        externalId: "100",
        nome: "Pão francês",
        calorias100g: 300,
        proteinas100g: 8,
        carboidratos100g: 58.6,
        gorduras100g: 3.1,
        fibras100g: 2.3,
        source: "TACO",
      },
    ])
  })

  it("should map null or missing nutrients as zero", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          getFoodByName: [
            {
              id: 101,
              name: "Pao zero",
              nutrients: null,
            },
          ],
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const AlimentoService = await importService()
    const service = new AlimentoService()

    const result = await service.searchExternal({
      q: "pao",
      source: "TACO",
      limit: 20,
    })

    expect(result).toEqual([
      {
        externalId: "101",
        nome: "Pao zero",
        calorias100g: 0,
        proteinas100g: 0,
        carboidratos100g: 0,
        gorduras100g: 0,
        fibras100g: 0,
        source: "TACO",
      },
    ])
  })

  it("should fallback to local filtered foods on invalid GraphQL payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {},
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const AlimentoService = await importService()
    const service = new AlimentoService()

    const result = await service.searchExternal({
      q: "pao",
      source: "TACO",
      limit: 20,
    })

    expect(result).toHaveLength(1)
    expect(result[0].nome).toBe("Pão francês")
    expect(result[0].source).toBe("TACO")
  })

  it("should fallback to local filtered foods on network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("connect timeout"))
    vi.stubGlobal("fetch", fetchMock)

    const AlimentoService = await importService()
    const service = new AlimentoService()

    const result = await service.searchExternal({
      q: "pao",
      source: "TACO",
      limit: 20,
    })

    expect(result).toHaveLength(1)
    expect(result[0].nome).toBe("Pão francês")
  })

  it("should keep source ALL behavior by merging TACO results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          getFoodByName: [
            {
              id: 102,
              name: "Pão integral",
              nutrients: {
                kcal: 250,
                protein: 10,
                carbohydrates: 45,
                lipids: 2,
                dietaryFiber: 6,
              },
            },
          ],
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const AlimentoService = await importService()
    const service = new AlimentoService()

    const result = await service.searchExternal({
      q: "pao",
      source: "ALL",
      limit: 20,
    })

    expect(result).toHaveLength(1)
    expect(result[0].nome).toBe("Pão integral")
    expect(result[0].source).toBe("TACO")
  })
})

