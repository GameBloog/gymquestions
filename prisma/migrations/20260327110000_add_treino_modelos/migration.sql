-- CreateTable
CREATE TABLE "treino_modelos" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treino_modelos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treino_modelo_dias" (
    "id" TEXT NOT NULL,
    "treinoModeloId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "diaSemana" INTEGER,
    "observacoes" TEXT,
    "metodo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treino_modelo_dias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treino_modelo_dia_exercicios" (
    "id" TEXT NOT NULL,
    "treinoModeloDiaId" TEXT NOT NULL,
    "exercicioId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "series" INTEGER,
    "repeticoes" TEXT,
    "cargaSugerida" DOUBLE PRECISION,
    "observacoes" TEXT,
    "metodo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treino_modelo_dia_exercicios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treino_modelos_professorId_updatedAt_idx" ON "treino_modelos"("professorId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "treino_modelo_dias_treinoModeloId_ordem_key" ON "treino_modelo_dias"("treinoModeloId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "treino_modelo_dia_exercicios_treinoModeloDiaId_ordem_key" ON "treino_modelo_dia_exercicios"("treinoModeloDiaId", "ordem");

-- AddForeignKey
ALTER TABLE "treino_modelos" ADD CONSTRAINT "treino_modelos_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treino_modelo_dias" ADD CONSTRAINT "treino_modelo_dias_treinoModeloId_fkey" FOREIGN KEY ("treinoModeloId") REFERENCES "treino_modelos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treino_modelo_dia_exercicios" ADD CONSTRAINT "treino_modelo_dia_exercicios_treinoModeloDiaId_fkey" FOREIGN KEY ("treinoModeloDiaId") REFERENCES "treino_modelo_dias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treino_modelo_dia_exercicios" ADD CONSTRAINT "treino_modelo_dia_exercicios_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "exercicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
