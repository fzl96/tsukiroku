import { addDays, addMonths } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export const DEFAULT_FINANCE_TIMEZONE = "Asia/Jakarta"

export function isValidTimeZone(timezone: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

export function normalizeTimeZone(timezone: string | null | undefined) {
  return timezone && isValidTimeZone(timezone)
    ? timezone
    : DEFAULT_FINANCE_TIMEZONE
}

export function getDateInputValueInTimeZone(date: Date, timezone: string) {
  return formatInTimeZone(date, normalizeTimeZone(timezone), "yyyy-MM-dd")
}

export function getTimeInputValueInTimeZone(date: Date, timezone: string) {
  return formatInTimeZone(date, normalizeTimeZone(timezone), "HH:mm")
}

export function zonedDateTimeToDate(
  date: string,
  time: string | null | undefined,
  timezone: string
) {
  return fromZonedTime(
    `${date}T${time || "00:00"}:00`,
    normalizeTimeZone(timezone)
  )
}

export function parseUserDateAsUtc(date: string, timezone: string) {
  return zonedDateTimeToDate(date, "00:00", timezone)
}

function addDaysToDateString(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number)
  const utcDate = new Date(Date.UTC(year, month - 1, day + days, 12))

  return formatInTimeZone(utcDate, "UTC", "yyyy-MM-dd")
}

export function getZonedDayRange(date: Date, timezone: string) {
  const zonedDate = getDateInputValueInTimeZone(date, timezone)
  const startUtc = parseUserDateAsUtc(zonedDate, timezone)
  const endUtc = parseUserDateAsUtc(addDaysToDateString(zonedDate, 1), timezone)

  return { startUtc, endUtc }
}

export function getZonedWeekRange(
  date: Date,
  timezone: string,
  weekStartsOn: number
) {
  const localDate = getDateInputValueInTimeZone(date, timezone)
  const localMidday = zonedDateTimeToDate(localDate, "12:00", timezone)
  const day = Number(formatInTimeZone(localMidday, timezone, "i")) % 7
  const daysSinceStart = (day - weekStartsOn + 7) % 7
  const startLocalDate = getDateInputValueInTimeZone(
    addDays(localMidday, -daysSinceStart),
    timezone
  )
  const endLocalDate = addDaysToDateString(startLocalDate, 7)

  return {
    startUtc: parseUserDateAsUtc(startLocalDate, timezone),
    endUtc: parseUserDateAsUtc(endLocalDate, timezone),
  }
}

export function getZonedMonthRange(
  date: Date,
  timezone: string,
  monthStartDay: number
) {
  const localYear = Number(formatInTimeZone(date, timezone, "yyyy"))
  const localMonthIndex = Number(formatInTimeZone(date, timezone, "M")) - 1
  const localDay = Number(formatInTimeZone(date, timezone, "d"))
  const startMonthIndex =
    localDay >= monthStartDay ? localMonthIndex : localMonthIndex - 1
  const startLocalAnchor = new Date(
    Date.UTC(localYear, startMonthIndex, monthStartDay, 12)
  )
  const endLocalAnchor = addMonths(startLocalAnchor, 1)
  const startLocalDate = formatInTimeZone(startLocalAnchor, "UTC", "yyyy-MM-dd")
  const endLocalDate = formatInTimeZone(endLocalAnchor, "UTC", "yyyy-MM-dd")

  return {
    startUtc: parseUserDateAsUtc(startLocalDate, timezone),
    endUtc: parseUserDateAsUtc(endLocalDate, timezone),
  }
}

export function getZonedYearRange(date: Date, timezone: string) {
  const localYear = Number(formatInTimeZone(date, timezone, "yyyy"))

  return {
    startUtc: parseUserDateAsUtc(`${localYear}-01-01`, timezone),
    endUtc: parseUserDateAsUtc(`${localYear + 1}-01-01`, timezone),
  }
}

export function formatDateForUser(date: Date, timezone: string) {
  return formatInTimeZone(date, normalizeTimeZone(timezone), "MMM d, yyyy")
}

export function formatDateTimeForUser(date: Date, timezone: string) {
  return formatInTimeZone(
    date,
    normalizeTimeZone(timezone),
    "MMM d, yyyy HH:mm"
  )
}
