export interface LeadClickAggregateEvent {
  leadLinkId: string
  clickedAt: Date
  fingerprint: string
}

export function normalizeSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
}

export function buildDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const day = parts.find((part) => part.type === "day")?.value ?? "01"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const year = parts.find((part) => part.type === "year")?.value ?? "1970"

  return `${year}-${month}-${day}`
}

export function buildRecentDateKeys(
  rangeDays: number,
  now: Date,
  timeZone: string,
): string[] {
  const keys: string[] = []

  for (let offset = rangeDays - 1; offset >= 0; offset--) {
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)
    keys.push(buildDateKey(date, timeZone))
  }

  return keys
}

export function aggregateClicks(
  events: LeadClickAggregateEvent[],
  timeZone: string,
  allowedDateKeys?: Set<string>,
) {
  const totalByLink = new Map<string, number>()
  const uniqueByLink = new Map<string, number>()
  const totalByDate = new Map<string, number>()
  const uniqueByDate = new Map<string, number>()

  const uniquePerLinkDateFingerprint = new Set<string>()

  for (const event of events) {
    const dateKey = buildDateKey(event.clickedAt, timeZone)

    if (allowedDateKeys && !allowedDateKeys.has(dateKey)) {
      continue
    }

    totalByLink.set(event.leadLinkId, (totalByLink.get(event.leadLinkId) ?? 0) + 1)
    totalByDate.set(dateKey, (totalByDate.get(dateKey) ?? 0) + 1)

    const uniqueKey = `${event.leadLinkId}:${dateKey}:${event.fingerprint}`
    if (!uniquePerLinkDateFingerprint.has(uniqueKey)) {
      uniquePerLinkDateFingerprint.add(uniqueKey)
      uniqueByLink.set(
        event.leadLinkId,
        (uniqueByLink.get(event.leadLinkId) ?? 0) + 1,
      )
      uniqueByDate.set(dateKey, (uniqueByDate.get(dateKey) ?? 0) + 1)
    }
  }

  return {
    totalByLink,
    uniqueByLink,
    totalByDate,
    uniqueByDate,
  }
}
