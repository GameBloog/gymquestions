-- AlterTable
ALTER TABLE "public"."finance_entries" ADD COLUMN     "professorId" TEXT;

-- CreateIndex
CREATE INDEX "finance_entries_professorId_idx" ON "public"."finance_entries"("professorId");

-- AddForeignKey
ALTER TABLE "public"."finance_entries" ADD CONSTRAINT "finance_entries_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "public"."professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
