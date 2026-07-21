"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 py-10 text-center">
      <h2 className="font-display text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        Try again. If this keeps happening, check your connection and session.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
