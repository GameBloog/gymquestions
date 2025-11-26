-- CreateTable
CREATE TABLE "public"."invite_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "public"."invite_codes"("code");
