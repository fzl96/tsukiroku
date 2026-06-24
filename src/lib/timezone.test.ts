import { describe, expect, test } from "bun:test"

import {
  getDateInputValueInTimeZone,
  getTimeInputValueInTimeZone,
  getZonedDayRange,
  getZonedMonthRange,
  getZonedWeekRange,
  formatDateTimeForUser,
  isValidTimeZone,
  zonedDateTimeToDate,
} from "./timezone"

describe("timezone helpers", () => {
  test("validates IANA time zones", () => {
    expect(isValidTimeZone("Asia/Jakarta")).toBe(true)
    expect(isValidTimeZone("America/New_York")).toBe(true)
    expect(isValidTimeZone("Not/AZone")).toBe(false)
  })

  test("formats date inputs in the provided time zone", () => {
    const instant = new Date("2026-06-23T18:00:00.000Z")

    expect(getDateInputValueInTimeZone(instant, "Asia/Jakarta")).toBe(
      "2026-06-24"
    )
    expect(getTimeInputValueInTimeZone(instant, "Asia/Jakarta")).toBe("01:00")
  })

  test("converts a local wall time in a zone to an instant", () => {
    expect(
      zonedDateTimeToDate("2026-06-24", "10:00", "Asia/Jakarta").toISOString()
    ).toBe("2026-06-24T03:00:00.000Z")
  })

  test("builds day ranges from local timezone boundaries", () => {
    const range = getZonedDayRange(
      new Date("2026-06-23T18:00:00.000Z"),
      "Asia/Jakarta"
    )

    expect(range.startUtc.toISOString()).toBe("2026-06-23T17:00:00.000Z")
    expect(range.endUtc.toISOString()).toBe("2026-06-24T17:00:00.000Z")
  })

  test("builds week ranges with weekStartsOn in the user timezone", () => {
    const range = getZonedWeekRange(
      new Date("2026-06-24T03:00:00.000Z"),
      "Asia/Jakarta",
      1
    )

    expect(range.startUtc.toISOString()).toBe("2026-06-21T17:00:00.000Z")
    expect(range.endUtc.toISOString()).toBe("2026-06-28T17:00:00.000Z")
  })

  test("builds custom month ranges in the user timezone", () => {
    const range = getZonedMonthRange(
      new Date("2026-06-24T03:00:00.000Z"),
      "Asia/Jakarta",
      25
    )

    expect(range.startUtc.toISOString()).toBe("2026-05-24T17:00:00.000Z")
    expect(range.endUtc.toISOString()).toBe("2026-06-24T17:00:00.000Z")
  })

  test("keeps local dates distinct across timezones", () => {
    const instant = new Date("2026-06-23T17:30:00.000Z")

    expect(getDateInputValueInTimeZone(instant, "Asia/Jakarta")).toBe(
      "2026-06-24"
    )
    expect(getDateInputValueInTimeZone(instant, "UTC")).toBe("2026-06-23")
    expect(getDateInputValueInTimeZone(instant, "America/New_York")).toBe(
      "2026-06-23"
    )
    expect(getDateInputValueInTimeZone(instant, "Asia/Tokyo")).toBe(
      "2026-06-24"
    )
  })

  test("formats date and time in the user timezone", () => {
    const instant = new Date("2026-06-23T17:30:00.000Z")

    expect(formatDateTimeForUser(instant, "Asia/Jakarta")).toBe(
      "Jun 24, 2026 00:30"
    )
    expect(formatDateTimeForUser(instant, "UTC")).toBe("Jun 23, 2026 17:30")
  })
})
