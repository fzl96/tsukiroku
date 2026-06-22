import { describe, expect, test } from "bun:test"

import { getLoginRedirectUrl, isPublicAuthPath } from "./auth-routes"

describe("auth routes", () => {
  test("allows the public user-facing routes", () => {
    expect(isPublicAuthPath("/")).toBe(true)
    expect(isPublicAuthPath("/login")).toBe(true)
  })

  test("allows the auth callback used by Supabase redirects", () => {
    expect(isPublicAuthPath("/auth/callback")).toBe(true)
  })

  test("protects dashboard routes", () => {
    expect(isPublicAuthPath("/dashboard")).toBe(false)
    expect(isPublicAuthPath("/dashboard/settings")).toBe(false)
  })

  test("protects unknown app routes by default", () => {
    expect(isPublicAuthPath("/accounts")).toBe(false)
  })

  test("preserves the protected destination in the login redirect", () => {
    const redirectUrl = getLoginRedirectUrl(
      new URL("https://app.test/dashboard/settings?tab=billing"),
    )

    expect(redirectUrl.toString()).toBe(
      "https://app.test/login?next=%2Fdashboard%2Fsettings%3Ftab%3Dbilling",
    )
  })
})
