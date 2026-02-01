/*
  Warnings:

  - You are about to drop the `aluno_historico` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TipoArquivo" AS ENUM ('TREINO', 'DIETA');

-- DropForeignKey
ALTER TABLE "public"."aluno_historico" DROP CONSTRAINT "aluno_historico_alunoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."aluno_historico" DROP CONSTRAINT "aluno_historico_registradoPor_fkey";

-- DropTable
DROP TABLE "public"."aluno_historico";

-- CreateTable
CREATE TABLE "public"."fotos_shape" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_shape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."arquivos_aluno" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "tipo" "public"."TipoArquivo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arquivos_aluno_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."fotos_shape" ADD CONSTRAINT "fotos_shape_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "public"."alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."arquivos_aluno" ADD CONSTRAINT "arquivos_aluno_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "public"."alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."arquivos_aluno" ADD CONSTRAINT "arquivos_aluno_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "public"."professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
