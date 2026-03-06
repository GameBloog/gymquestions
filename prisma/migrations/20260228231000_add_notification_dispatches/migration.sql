CREATE TYPE "NotificationTipo" AS ENUM ('FOTO_SEXTA_LEMBRETE', 'REAVALIACAO');

CREATE TABLE "notification_dispatches" (
  "id" TEXT NOT NULL,
  "alunoId" TEXT NOT NULL,
  "tipo" "NotificationTipo" NOT NULL,
  "referenceDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_dispatches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_dispatches_alunoId_tipo_referenceDate_key"
ON "notification_dispatches"("alunoId", "tipo", "referenceDate");

CREATE INDEX "notification_dispatches_tipo_referenceDate_idx"
ON "notification_dispatches"("tipo", "referenceDate");

ALTER TABLE "notification_dispatches"
ADD CONSTRAINT "notification_dispatches_alunoId_fkey"
FOREIGN KEY ("alunoId") REFERENCES "alunos"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
