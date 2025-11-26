-- CreateTable
CREATE TABLE "public"."professores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telefone" TEXT,
    "especialidade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alunos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "telefone" TEXT,
    "alturaCm" INTEGER,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professores_userId_key" ON "public"."professores"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_userId_key" ON "public"."alunos"("userId");

-- AddForeignKey
ALTER TABLE "public"."professores" ADD CONSTRAINT "professores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alunos" ADD CONSTRAINT "alunos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alunos" ADD CONSTRAINT "alunos_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "public"."professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
