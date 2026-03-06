import { ObjetivoDieta, SexoBiologico } from "@prisma/client"

interface NavyBodyFatInput {
  sexoBiologico: SexoBiologico
  alturaCm: number
  cinturaCm: number
  pescocoCm: number
  quadrilCm?: number | null
}

interface BmrInput {
  sexoBiologico: SexoBiologico
  pesoKg: number
  alturaCm: number
  idade: number
}

interface MacroInput {
  objetivo: ObjetivoDieta
  pesoKg: number
  caloriasMeta: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

export function calculateNavyBodyFat(input: NavyBodyFatInput): number | null {
  const { sexoBiologico, alturaCm, cinturaCm, pescocoCm, quadrilCm } = input

  if (alturaCm <= 0 || cinturaCm <= 0 || pescocoCm <= 0) {
    return null
  }

  if (sexoBiologico === SexoBiologico.MASCULINO) {
    const diff = cinturaCm - pescocoCm
    if (diff <= 0) {
      return null
    }

    const result =
      86.01 * Math.log10(diff) - 70.041 * Math.log10(alturaCm) + 36.76
    if (!Number.isFinite(result)) {
      return null
    }
    return round2(Math.max(2, Math.min(70, result)))
  }

  if (!quadrilCm || quadrilCm <= 0) {
    return null
  }

  const diff = cinturaCm + quadrilCm - pescocoCm
  if (diff <= 0) {
    return null
  }

  const result =
    163.205 * Math.log10(diff) - 97.684 * Math.log10(alturaCm) - 78.387

  if (!Number.isFinite(result)) {
    return null
  }

  return round2(Math.max(2, Math.min(70, result)))
}

export function calculateLeanMassKg(
  pesoKg?: number | null,
  percentualGordura?: number | null,
) {
  if (!pesoKg || pesoKg <= 0 || percentualGordura === undefined || percentualGordura === null) {
    return null
  }

  const leanMass = pesoKg * (1 - percentualGordura / 100)
  if (!Number.isFinite(leanMass)) {
    return null
  }

  return round2(Math.max(0, leanMass))
}

export function calculateBmr(input: BmrInput): number | null {
  const { sexoBiologico, pesoKg, alturaCm, idade } = input

  if (pesoKg <= 0 || alturaCm <= 0 || idade <= 0) {
    return null
  }

  if (sexoBiologico === SexoBiologico.MASCULINO) {
    return round2(10 * pesoKg + 6.25 * alturaCm - 5 * idade + 5)
  }

  return round2(10 * pesoKg + 6.25 * alturaCm - 5 * idade - 161)
}

export function resolveActivityFactor(diasTreinoSemana?: number | null) {
  if (!diasTreinoSemana || diasTreinoSemana <= 1) return 1.2
  if (diasTreinoSemana <= 3) return 1.375
  if (diasTreinoSemana <= 5) return 1.55
  if (diasTreinoSemana === 6) return 1.725
  return 1.9
}

export function calculateTargetCalories(
  objetivo: ObjetivoDieta,
  caloriasManutencao: number,
) {
  if (!Number.isFinite(caloriasManutencao) || caloriasManutencao <= 0) {
    return 0
  }

  if (objetivo === ObjetivoDieta.PERDER) {
    return round2(caloriasManutencao * 0.85)
  }
  if (objetivo === ObjetivoDieta.GANHAR) {
    return round2(caloriasManutencao * 1.12)
  }

  return round2(caloriasManutencao)
}

export function calculateMacroTargets(input: MacroInput) {
  const { objetivo, pesoKg, caloriasMeta } = input

  if (pesoKg <= 0 || caloriasMeta <= 0) {
    return {
      proteinasG: 0,
      carboidratosG: 0,
      gordurasG: 0,
    }
  }

  const proteinPerKg = objetivo === ObjetivoDieta.PERDER ? 2.0 : 1.8
  const fatPerKg = objetivo === ObjetivoDieta.GANHAR ? 1.0 : 0.8

  const proteinasG = round2(pesoKg * proteinPerKg)
  const gordurasG = round2(pesoKg * fatPerKg)

  const caloriasProteina = proteinasG * 4
  const caloriasGordura = gordurasG * 9
  const caloriasRestantes = Math.max(0, caloriasMeta - caloriasProteina - caloriasGordura)
  const carboidratosG = round2(caloriasRestantes / 4)

  return {
    proteinasG,
    carboidratosG,
    gordurasG,
  }
}

export function calculateFoodMacrosByQuantity(
  quantidadeGramas: number,
  valoresPor100g: {
    calorias100g: number
    proteinas100g: number
    carboidratos100g: number
    gorduras100g: number
    fibras100g?: number | null
  },
) {
  const base = quantidadeGramas / 100

  return {
    calorias: round2(valoresPor100g.calorias100g * base),
    proteinas: round2(valoresPor100g.proteinas100g * base),
    carboidratos: round2(valoresPor100g.carboidratos100g * base),
    gorduras: round2(valoresPor100g.gorduras100g * base),
    fibras:
      valoresPor100g.fibras100g !== undefined && valoresPor100g.fibras100g !== null
        ? round2(valoresPor100g.fibras100g * base)
        : null,
  }
}
