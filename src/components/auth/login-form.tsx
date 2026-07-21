"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  devLoginAction,
  loginAction,
  type AuthActionResult,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthActionResult = {};

export function LoginForm({
  initialError,
  showDevBypass = false,
  devLoginLabel = "Skip login (dev)",
}: {
  initialError?: string | null;
  showDevBypass?: boolean;
  devLoginLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const [devState, devFormAction, devPending] = useActionState(
    devLoginAction,
    initial,
  );

  const error = state.error ?? devState.error ?? initialError;

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        {error && (
          <p
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="min-h-12"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-12"
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="underline underline-offset-4">
            Forgot password?
          </Link>
        </p>
      </form>

      {showDevBypass ? (
        <form action={devFormAction} className="space-y-2 border-t border-border pt-4">
          <p className="text-center text-xs text-muted-foreground">
            Local development only — uses DEV_LOGIN_* from .env.local
          </p>
          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            size="lg"
            disabled={devPending || pending}
          >
            {devPending ? "Skipping…" : devLoginLabel}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
