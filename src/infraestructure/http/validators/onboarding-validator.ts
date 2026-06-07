import { z } from "zod"

export const onboardingProgressSchema = z.object({
  currentStepKey: z.string().min(1),
})

export const onboardingChecklistItemSchema = z.object({
  key: z.string().min(1),
})
