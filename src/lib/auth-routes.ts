const PUBLIC_AUTH_PATHS = new Set(["/", "/login", "/auth/callback"])

export function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.has(pathname)
}

export function getLoginRedirectUrl(requestUrl: URL) {
  const loginUrl = new URL("/login", requestUrl.origin)
  const nextPath = `${requestUrl.pathname}${requestUrl.search}`

  loginUrl.searchParams.set("next", nextPath)

  return loginUrl
}
