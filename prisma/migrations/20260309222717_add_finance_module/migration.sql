-- CreateEnum
CREATE TYPE "public"."FinanceMonthStatus" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "public"."FinanceRenewalPlanType" AS ENUM ('COMPLETO', 'TREINO', 'DIETA');

-- CreateEnum
CREATE TYPE "public"."FinanceEntryType" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "public"."FinanceEntryCategory" AS ENUM ('CAMISA', 'YOUTUBE', 'PARCERIA', 'OUTRA_RECEITA', 'CUSTO_OPERACIONAL', 'OUTRA_DESPESA');

-- CreateTable
CREATE TABLE "public"."finance_months" (
    "month" TEXT NOT NULL,
    "status" "public"."FinanceMonthStatus" NOT NULL DEFAULT 'ABERTO',
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_months_pkey" PRIMARY KEY ("month")
);

-- CreateTable
CREATE TABLE "public"."finance_renewals" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "tipoPlano" "public"."FinanceRenewalPlanType" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "renovadoEm" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."finance_entries" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "tipo" "public"."FinanceEntryType" NOT NULL,
    "categoria" "public"."FinanceEntryCategory" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "quantidade" INTEGER,
    "descricao" TEXT,
    "dataLancamento" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_renewals_month_renovadoEm_idx" ON "public"."finance_renewals"("month", "renovadoEm");

-- CreateIndex
CREATE INDEX "finance_renewals_alunoId_renovadoEm_idx" ON "public"."finance_renewals"("alunoId", "renovadoEm");

-- CreateIndex
CREATE INDEX "finance_entries_month_tipo_dataLancamento_idx" ON "public"."finance_entries"("month", "tipo", "dataLancamento");

-- CreateIndex
CREATE INDEX "finance_entries_categoria_dataLancamento_idx" ON "public"."finance_entries"("categoria", "dataLancamento");

-- AddForeignKey
ALTER TABLE "public"."finance_renewals" ADD CONSTRAINT "finance_renewals_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "public"."alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."finance_renewals" ADD CONSTRAINT "finance_renewals_month_fkey" FOREIGN KEY ("month") REFERENCES "public"."finance_months"("month") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."finance_entries" ADD CONSTRAINT "finance_entries_month_fkey" FOREIGN KEY ("month") REFERENCES "public"."finance_months"("month") ON DELETE RESTRICT ON UPDATE CASCADE;
