import type { ReactNode } from "react";

/** Minimal shell — login owns its landing; other auth pages bring their own frame. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
