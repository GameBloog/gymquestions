-- CreateTable
CREATE TABLE "public"."aluno_historico" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "pesoKg" DOUBLE PRECISION,
    "alturaCm" INTEGER,
    "cinturaCm" INTEGER,
    "quadrilCm" INTEGER,
    "pescocoCm" INTEGER,
    "bracoEsquerdoCm" DOUBLE PRECISION,
    "bracoDireitoCm" DOUBLE PRECISION,
    "pernaEsquerdaCm" DOUBLE PRECISION,
    "pernaDireitaCm" DOUBLE PRECISION,
    "percentualGordura" DOUBLE PRECISION,
    "massaMuscularKg" DOUBLE PRECISION,
    "observacoes" TEXT,
    "registradoPor" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aluno_historico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aluno_historico_alunoId_idx" ON "public"."aluno_historico"("alunoId");

-- CreateIndex
CREATE INDEX "aluno_historico_dataRegistro_idx" ON "public"."aluno_historico"("dataRegistro");

-- AddForeignKey
ALTER TABLE "public"."aluno_historico" ADD CONSTRAINT "aluno_historico_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "public"."alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."aluno_historico" ADD CONSTRAINT "aluno_historico_registradoPor_fkey" FOREIGN KEY ("registradoPor") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
