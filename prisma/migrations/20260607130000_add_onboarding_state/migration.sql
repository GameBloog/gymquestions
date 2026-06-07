-- CreateEnum
CREATE TYPE "public"."OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateTable
CREATE TABLE "public"."user_onboarding_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "flowVersion" TEXT NOT NULL,
    "status" "public"."OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStepKey" TEXT,
    "completedChecklistItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "restartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_onboarding_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_states_userId_role_flowVersion_key" ON "public"."user_onboarding_states"("userId", "role", "flowVersion");

-- CreateIndex
CREATE INDEX "user_onboarding_states_userId_status_idx" ON "public"."user_onboarding_states"("userId", "status");

-- AddForeignKey
ALTER TABLE "public"."user_onboarding_states" ADD CONSTRAINT "user_onboarding_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
