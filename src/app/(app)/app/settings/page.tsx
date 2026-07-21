import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/app/settings/profile", label: "Profile & preferences" },
  { href: "/app/settings/household", label: "Household" },
  { href: "/app/settings/notifications", label: "Notifications" },
  { href: "/app/pantry", label: "Pantry" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-xl border border-border bg-card px-4 py-3 font-medium"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
