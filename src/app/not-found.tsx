import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <Button asChild>
        <Link href="/app/week">Back to week</Link>
      </Button>
    </div>
  );
}
