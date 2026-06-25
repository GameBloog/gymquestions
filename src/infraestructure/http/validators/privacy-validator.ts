import {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  LegalDocumentType,
} from "@prisma/client"
import { z } from "zod"

export const acceptedDocumentSchema = z.object({
  documentType: z.nativeEnum(LegalDocumentType),
  version: z.string().min(1).max(50),
})

export const legalAcceptanceSchema = z.object({
  acceptedDocuments: z.array(acceptedDocumentSchema).min(2),
})

export const privacyPreferencesSchema = z.object({
  analyticsConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  emailConsent: z.boolean().optional(),
  whatsappConsent: z.boolean().optional(),
})

export const dataSubjectRequestSchema = z.object({
  type: z.nativeEnum(DataSubjectRequestType),
  description: z.string().max(1000).optional(),
})

export const processDataSubjectRequestSchema = z.object({
  status: z.nativeEnum(DataSubjectRequestStatus),
  response: z.string().max(2000).optional(),
})

export const adminRequestParamsSchema = z.object({
  id: z.string().uuid(),
})
