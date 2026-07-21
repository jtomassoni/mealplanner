import {
  addWeeks as dateFnsAddWeeks,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function formatWeekStart(date: Date): string {
  return format(getWeekStart(date), "yyyy-MM-dd");
}

export function parseWeekStart(s: string): Date {
  return getWeekStart(parseISO(s));
}

export function getWeekDays(weekStart: Date): Date[] {
  const start = getWeekStart(weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function addWeeks(weekStart: Date, n: number): Date {
  return dateFnsAddWeeks(getWeekStart(weekStart), n);
}
