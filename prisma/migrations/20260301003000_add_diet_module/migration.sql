-- CreateEnum
CREATE TYPE "SexoBiologico" AS ENUM ('MASCULINO', 'FEMININO');

-- CreateEnum
CREATE TYPE "OrigemAlimento" AS ENUM ('SISTEMA', 'EXTERNO', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "ObjetivoDieta" AS ENUM ('MANTER', 'PERDER', 'GANHAR');

-- AlterTable
ALTER TABLE "alunos" ADD COLUMN "sexoBiologico" "SexoBiologico";

-- CreateTable
CREATE TABLE "alimentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "origem" "OrigemAlimento" NOT NULL DEFAULT 'EXTERNO',
    "externalId" TEXT,
    "fonteExterna" TEXT,
    "calorias100g" DOUBLE PRECISION NOT NULL,
    "proteinas100g" DOUBLE PRECISION NOT NULL,
    "carboidratos100g" DOUBLE PRECISION NOT NULL,
    "gorduras100g" DOUBLE PRECISION NOT NULL,
    "fibras100g" DOUBLE PRECISION,
    "professorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_dieta" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "objetivo" "ObjetivoDieta" NOT NULL,
    "percentualGordura" DOUBLE PRECISION,
    "massaMagraKg" DOUBLE PRECISION,
    "tmbKcal" DOUBLE PRECISION,
    "fatorAtividade" DOUBLE PRECISION,
    "caloriasMeta" DOUBLE PRECISION NOT NULL,
    "proteinasMetaG" DOUBLE PRECISION NOT NULL,
    "carboidratosMetaG" DOUBLE PRECISION NOT NULL,
    "gordurasMetaG" DOUBLE PRECISION NOT NULL,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_dieta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dieta_dias" (
    "id" TEXT NOT NULL,
    "planoDietaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "diaSemana" INTEGER,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dieta_dias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dieta_refeicoes" (
    "id" TEXT NOT NULL,
    "dietaDiaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "horario" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dieta_refeicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dieta_refeicao_itens" (
    "id" TEXT NOT NULL,
    "dietaRefeicaoId" TEXT NOT NULL,
    "alimentoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "quantidadeGramas" DOUBLE PRECISION NOT NULL,
    "calorias" DOUBLE PRECISION NOT NULL,
    "proteinas" DOUBLE PRECISION NOT NULL,
    "carboidratos" DOUBLE PRECISION NOT NULL,
    "gorduras" DOUBLE PRECISION NOT NULL,
    "fibras" DOUBLE PRECISION,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dieta_refeicao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dieta_checkins" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "planoDietaId" TEXT NOT NULL,
    "dietaDiaId" TEXT NOT NULL,
    "status" "CheckinStatus" NOT NULL DEFAULT 'INICIADO',
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),
    "dataDieta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacaoDia" TEXT,
    "comentarioProfessor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dieta_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dieta_refeicao_checkins" (
    "id" TEXT NOT NULL,
    "checkinId" TEXT NOT NULL,
    "dietaRefeicaoId" TEXT NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "observacaoAluno" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dieta_refeicao_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alimentos_nome_idx" ON "alimentos"("nome");

-- CreateIndex
CREATE INDEX "alimentos_professorId_idx" ON "alimentos"("professorId");

-- CreateIndex
CREATE UNIQUE INDEX "alimentos_fonteExterna_externalId_key" ON "alimentos"("fonteExterna", "externalId");

-- CreateIndex
CREATE INDEX "planos_dieta_alunoId_ativo_idx" ON "planos_dieta"("alunoId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "dieta_dias_planoDietaId_ordem_key" ON "dieta_dias"("planoDietaId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "dieta_refeicoes_dietaDiaId_ordem_key" ON "dieta_refeicoes"("dietaDiaId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "dieta_refeicao_itens_dietaRefeicaoId_ordem_key" ON "dieta_refeicao_itens"("dietaRefeicaoId", "ordem");

-- CreateIndex
CREATE INDEX "dieta_checkins_alunoId_dataDieta_idx" ON "dieta_checkins"("alunoId", "dataDieta");

-- CreateIndex
CREATE INDEX "dieta_checkins_dietaDiaId_status_idx" ON "dieta_checkins"("dietaDiaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dieta_refeicao_checkins_checkinId_dietaRefeicaoId_key" ON "dieta_refeicao_checkins"("checkinId", "dietaRefeicaoId");

-- AddForeignKey
ALTER TABLE "alimentos" ADD CONSTRAINT "alimentos_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_dieta" ADD CONSTRAINT "planos_dieta_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_dieta" ADD CONSTRAINT "planos_dieta_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_dias" ADD CONSTRAINT "dieta_dias_planoDietaId_fkey" FOREIGN KEY ("planoDietaId") REFERENCES "planos_dieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_refeicoes" ADD CONSTRAINT "dieta_refeicoes_dietaDiaId_fkey" FOREIGN KEY ("dietaDiaId") REFERENCES "dieta_dias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_refeicao_itens" ADD CONSTRAINT "dieta_refeicao_itens_dietaRefeicaoId_fkey" FOREIGN KEY ("dietaRefeicaoId") REFERENCES "dieta_refeicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_refeicao_itens" ADD CONSTRAINT "dieta_refeicao_itens_alimentoId_fkey" FOREIGN KEY ("alimentoId") REFERENCES "alimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_checkins" ADD CONSTRAINT "dieta_checkins_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_checkins" ADD CONSTRAINT "dieta_checkins_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_checkins" ADD CONSTRAINT "dieta_checkins_planoDietaId_fkey" FOREIGN KEY ("planoDietaId") REFERENCES "planos_dieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_checkins" ADD CONSTRAINT "dieta_checkins_dietaDiaId_fkey" FOREIGN KEY ("dietaDiaId") REFERENCES "dieta_dias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_refeicao_checkins" ADD CONSTRAINT "dieta_refeicao_checkins_checkinId_fkey" FOREIGN KEY ("checkinId") REFERENCES "dieta_checkins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dieta_refeicao_checkins" ADD CONSTRAINT "dieta_refeicao_checkins_dietaRefeicaoId_fkey" FOREIGN KEY ("dietaRefeicaoId") REFERENCES "dieta_refeicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
