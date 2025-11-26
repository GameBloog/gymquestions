-- CreateTable
CREATE TABLE "public"."user_answers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alturaCm" INTEGER,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "pesoKg" DOUBLE PRECISION,
    "idade" INTEGER,
    "cinturaCm" INTEGER,
    "quadrilCm" INTEGER,
    "pescocoCm" INTEGER,
    "alimentos_quer_diario" JSONB,
    "alimentos_nao_comem" JSONB,
    "alergias_alimentares" JSONB,
    "dores_articulares" TEXT,
    "suplementos_consumidos" JSONB,
    "dias_treino_semana" INTEGER,
    "frequencia_horarios_refeicoes" TEXT,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);
