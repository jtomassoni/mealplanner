import { redirect } from "next/navigation";
import { formatWeekStart, getWeekStart } from "@/lib/week/dates";

export default function WeekIndexPage() {
  redirect(`/app/week/${formatWeekStart(getWeekStart(new Date()))}`);
}
