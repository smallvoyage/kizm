const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseCalendarDate(value: string): Date | null {
  const match = CALENDAR_DATE_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1) return null

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

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

function formatDate(date: Date): string | null {
  const value = date.toISOString().slice(0, 10)
  return parseCalendarDate(value) ? value : null
}

export function getWeekStart(date: string): string | null {
  const parsed = parseCalendarDate(date)
  if (!parsed) return null

  const daysSinceMonday = (parsed.getUTCDay() + 6) % 7
  parsed.setUTCDate(parsed.getUTCDate() - daysSinceMonday)
  return formatDate(parsed)
}

export function shiftDate(date: string, days: number): string | null {
  const parsed = parseCalendarDate(date)
  if (!parsed) return null

  return formatDate(new Date(parsed.getTime() + days * DAY_IN_MILLISECONDS))
}
