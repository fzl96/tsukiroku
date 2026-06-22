"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const oauthProviderSchema = z.enum(["google", "github"])

const ssoSignInSchema = z
  .object({
    domain: z.string().trim().min(1).optional(),
    providerId: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.domain || data.providerId, {
    message: "Provide an SSO domain or provider ID.",
  })

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export type SsoSignInState = {
  error?: string
}

async function getAuthRedirectUrl() {
  const headerStore = await headers()
  const origin = headerStore.get("origin")

  if (!origin) {
    return null
  }

  return `${origin}/auth/callback`
}

async function redirectToSupabaseAuthUrl(
  getUrl: () => Promise<ActionResult<{ url: string }>>,
) {
  const result = await getUrl()

  if (!result.success || !result.data?.url) {
    return result
  }

  redirect(result.data.url)
}

export async function signInWithOAuth(
  provider: unknown,
): Promise<ActionResult> {
  const parsedProvider = oauthProviderSchema.safeParse(provider)

  if (!parsedProvider.success) {
    return {
      success: false,
      error: "Unsupported OAuth provider.",
    }
  }

  return redirectToSupabaseAuthUrl(async () => {
    const redirectTo = await getAuthRedirectUrl()

    if (!redirectTo) {
      return {
        success: false,
        error: "Unable to determine the request origin.",
      }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: parsedProvider.data,
      options: {
        redirectTo,
      },
    })

    if (error || !data.url) {
      return {
        success: false,
        error: "Unable to start OAuth sign-in.",
      }
    }

    return {
      success: true,
      data: {
        url: data.url,
      },
    }
  })
}

export async function signInWithGoogle() {
  return signInWithOAuth("google")
}

export async function signInWithGitHub() {
  return signInWithOAuth("github")
}

export async function signInWithGoogleForm() {
  const result = await signInWithGoogle()

  if (!result.success) {
    throw new Error(result.error ?? "Unable to start Google sign-in.")
  }
}

export async function signInWithGitHubForm() {
  const result = await signInWithGitHub()

  if (!result.success) {
    throw new Error(result.error ?? "Unable to start GitHub sign-in.")
  }
}

export async function signInWithSSO(input: unknown): Promise<ActionResult> {
  const parsedInput = ssoSignInSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      error: "Provide an SSO domain or provider ID.",
    }
  }

  return redirectToSupabaseAuthUrl(async () => {
    const redirectTo = await getAuthRedirectUrl()

    if (!redirectTo) {
      return {
        success: false,
        error: "Unable to determine the request origin.",
      }
    }

    const supabase = await createClient()
    const { domain, providerId } = parsedInput.data
    const signInInput = domain
      ? { domain }
      : {
          providerId: providerId as string,
        }
    const { data, error } = await supabase.auth.signInWithSSO({
      ...signInInput,
      options: {
        redirectTo,
      },
    })

    if (error || !data.url) {
      return {
        success: false,
        error: "Unable to start SSO sign-in.",
      }
    }

    return {
      success: true,
      data: {
        url: data.url,
      },
    }
  })
}

export async function signInWithSSOForm(
  _state: SsoSignInState,
  formData: FormData,
): Promise<SsoSignInState> {
  const domainValue = formData.get("domain")
  const domain = typeof domainValue === "string" ? domainValue : ""
  const result = await signInWithSSO({ domain })

  if (!result.success) {
    return {
      error: result.error ?? "Unable to start SSO sign-in.",
    }
  }

  return {}
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
