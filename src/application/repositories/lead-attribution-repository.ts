export interface LeadLinkLookup {
  id: string
}

export interface LeadAttributionRepository {
  findActiveLeadLinkBySlug(slug: string): Promise<LeadLinkLookup | null>
  createFirstTouchAttribution(input: {
    leadLinkId: string
    userId: string
  }): Promise<void>
}
