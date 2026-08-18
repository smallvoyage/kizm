const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseCalendarDate(value: string): Date | null {
  const match = CALENDAR_DATE_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(0)
  parsed.setUTCFullYear(year, month - 1, day)
  parsed.setUTCHours(0, 0, 0, 0)

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? parsed
    : null
}

export function isCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null
}
