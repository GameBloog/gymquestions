-- CreateEnum
CREATE TYPE "LeadAttributionModel" AS ENUM ('FIRST_TOUCH');

-- CreateTable
CREATE TABLE "lead_links" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "canal" TEXT,
    "origem" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_click_events" (
    "id" TEXT NOT NULL,
    "leadLinkId" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "uaHash" TEXT,
    "fingerprint" TEXT NOT NULL,
    "referrer" TEXT,
    "path" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,

    CONSTRAINT "lead_click_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_attributions" (
    "id" TEXT NOT NULL,
    "leadLinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelo" "LeadAttributionModel" NOT NULL DEFAULT 'FIRST_TOUCH',

    CONSTRAINT "lead_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_links_slug_key" ON "lead_links"("slug");

-- CreateIndex
CREATE INDEX "lead_click_events_leadLinkId_clickedAt_idx" ON "lead_click_events"("leadLinkId", "clickedAt");

-- CreateIndex
CREATE INDEX "lead_click_events_fingerprint_clickedAt_idx" ON "lead_click_events"("fingerprint", "clickedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lead_attributions_userId_key" ON "lead_attributions"("userId");

-- CreateIndex
CREATE INDEX "lead_attributions_leadLinkId_attributedAt_idx" ON "lead_attributions"("leadLinkId", "attributedAt");

-- AddForeignKey
ALTER TABLE "lead_click_events" ADD CONSTRAINT "lead_click_events_leadLinkId_fkey" FOREIGN KEY ("leadLinkId") REFERENCES "lead_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attributions" ADD CONSTRAINT "lead_attributions_leadLinkId_fkey" FOREIGN KEY ("leadLinkId") REFERENCES "lead_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attributions" ADD CONSTRAINT "lead_attributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
