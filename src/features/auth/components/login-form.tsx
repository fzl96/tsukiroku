"use client"

import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  signInWithGitHubForm,
  signInWithGoogleForm,
  signInWithSSOForm,
  type SsoSignInState,
} from "@/features/auth/actions"

const initialSsoState: SsoSignInState = {}

export function LoginForm() {
  const [ssoState, ssoAction, isSsoPending] = useActionState(
    signInWithSSOForm,
    initialSsoState,
  )

  return (
    <section className="w-full max-w-sm">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Tsukiroku
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Use your workspace account to continue.
        </p>
      </div>

      <div className="space-y-3">
        <form action={signInWithGoogleForm}>
          <Button type="submit" variant="outline" className="w-full">
            <IconBrandGoogle aria-hidden="true" />
            Continue with Google
          </Button>
        </form>

        <form action={signInWithGitHubForm}>
          <Button type="submit" variant="outline" className="w-full">
            <IconBrandGithub aria-hidden="true" />
            Continue with GitHub
          </Button>
        </form>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={ssoAction} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="sso-domain" className="text-sm font-medium">
            SSO domain
          </label>
          <Input
            id="sso-domain"
            name="domain"
            type="text"
            placeholder="company.com"
            autoComplete="organization"
            aria-describedby={ssoState.error ? "sso-error" : undefined}
            aria-invalid={Boolean(ssoState.error)}
          />
          {ssoState.error ? (
            <p id="sso-error" className="text-sm text-destructive">
              {ssoState.error}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSsoPending}>
          {isSsoPending ? "Starting SSO..." : "Continue with SSO"}
        </Button>
      </form>
    </section>
  )
}
