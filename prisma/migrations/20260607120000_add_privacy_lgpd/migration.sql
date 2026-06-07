-- LGPD/privacy foundations.
CREATE TYPE "LegalDocumentType" AS ENUM ('PRIVACY_POLICY', 'TERMS_OF_USE');
CREATE TYPE "DataSubjectRequestType" AS ENUM ('EXPORT', 'DELETE', 'CORRECTION', 'CONSENT_REVOKE', 'OTHER');
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'FAILED');

ALTER TABLE "users"
ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "anonymizedAt" TIMESTAMP(3);

CREATE TABLE "legal_document_versions" (
  "id" TEXT NOT NULL,
  "documentType" "LegalDocumentType" NOT NULL,
  "version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_legal_acceptances" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "documentType" "LegalDocumentType" NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  CONSTRAINT "user_legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "privacy_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "analyticsConsent" BOOLEAN NOT NULL DEFAULT false,
  "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "emailConsent" BOOLEAN NOT NULL DEFAULT true,
  "whatsappConsent" BOOLEAN NOT NULL DEFAULT true,
  "documentVersion" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "privacy_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_subject_requests" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "DataSubjectRequestType" NOT NULL,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'OPEN',
  "description" TEXT,
  "response" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "processedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "privacy_audit_events" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "subjectId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "privacy_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legal_document_versions_documentType_version_key" ON "legal_document_versions"("documentType", "version");
CREATE INDEX "legal_document_versions_documentType_isCurrent_idx" ON "legal_document_versions"("documentType", "isCurrent");
CREATE UNIQUE INDEX "user_legal_acceptances_userId_documentVersionId_key" ON "user_legal_acceptances"("userId", "documentVersionId");
CREATE INDEX "user_legal_acceptances_userId_documentType_version_idx" ON "user_legal_acceptances"("userId", "documentType", "version");
CREATE UNIQUE INDEX "privacy_preferences_userId_key" ON "privacy_preferences"("userId");
CREATE INDEX "data_subject_requests_userId_requestedAt_idx" ON "data_subject_requests"("userId", "requestedAt");
CREATE INDEX "data_subject_requests_status_requestedAt_idx" ON "data_subject_requests"("status", "requestedAt");
CREATE INDEX "privacy_audit_events_actorId_createdAt_idx" ON "privacy_audit_events"("actorId", "createdAt");
CREATE INDEX "privacy_audit_events_subjectId_createdAt_idx" ON "privacy_audit_events"("subjectId", "createdAt");
CREATE INDEX "privacy_audit_events_action_createdAt_idx" ON "privacy_audit_events"("action", "createdAt");

ALTER TABLE "user_legal_acceptances" ADD CONSTRAINT "user_legal_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_legal_acceptances" ADD CONSTRAINT "user_legal_acceptances_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "legal_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_preferences" ADD CONSTRAINT "privacy_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "privacy_audit_events" ADD CONSTRAINT "privacy_audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
