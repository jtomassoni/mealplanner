import {
  CalendarDays,
  ShoppingCart,
  BookOpen,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/app/week",
    label: "Week",
    icon: CalendarDays,
    match: (p) => p.startsWith("/app/week"),
  },
  {
    href: "/app/grocery",
    label: "Grocery",
    icon: ShoppingCart,
    match: (p) => p.startsWith("/app/grocery"),
  },
  {
    href: "/app/recipes",
    label: "Recipes",
    icon: BookOpen,
    match: (p) => p.startsWith("/app/recipes"),
  },
  {
    href: "/app/history",
    label: "History",
    icon: History,
    match: (p) => p.startsWith("/app/history"),
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith("/app/settings") || p.startsWith("/app/pantry"),
  },
];
