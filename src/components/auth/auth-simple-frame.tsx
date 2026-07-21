import Link from "next/link";
import type { ReactNode } from "react";

/** Quiet frame for forgot/reset password flows. */
export function AuthSimpleFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="auth-ambient" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/login"
          className="font-display mb-8 block text-center text-3xl font-semibold text-primary transition-opacity hover:opacity-80"
        >
          Mealplan
        </Link>
        <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm backdrop-blur-sm">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
