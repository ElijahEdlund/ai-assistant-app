import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = 'America/New_York';

export function getTimezone(): string {
  return process.env.TIMEZONE || DEFAULT_TIMEZONE;
}

export function getLocalDate(): string {
  return dayjs().tz(getTimezone()).format('YYYY-MM-DD');
}

export function getLocalDateTime(): string {
  return dayjs().tz(getTimezone()).format('YYYY-MM-DD HH:mm:ss');
}

export function utcToLocal(utcString: string): dayjs.Dayjs {
  return dayjs.utc(utcString).tz(getTimezone());
}

export function localToUtc(localString: string, timezone?: string): string {
  const tz = timezone || getTimezone();
  return dayjs.tz(localString, tz).utc().toISOString();
}

export function startOfLocalDay(date?: string): string {
  const d = date ? dayjs.tz(date, getTimezone()) : dayjs().tz(getTimezone());
  return d.startOf('day').utc().toISOString();
}

export function endOfLocalDay(date?: string): string {
  const d = date ? dayjs.tz(date, getTimezone()) : dayjs().tz(getTimezone());
  return d.endOf('day').utc().toISOString();
}

export function addDays(date: string, days: number): string {
  return dayjs.tz(date, getTimezone()).add(days, 'day').format('YYYY-MM-DD');
}

export function parseTimeWindow(window: string): { start: string; end: string } {
  // Format: "09:00-12:00"
  const [start, end] = window.split('-');
  return { start: start.trim(), end: end.trim() };
}

export function computeDueAt(
  date: string, // YYYY-MM-DD (local date)
  timeWindow: string, // "09:00-12:00"
  timezone: string
): string {
  const { start } = parseTimeWindow(timeWindow);
  const localDateTime = `${date} ${start}:00`;
  return localToUtc(localDateTime, timezone);
}

export function isWithinTimeWindow(dueAt: string, window: string, toleranceMinutes: number = 15): boolean {
  const due = utcToLocal(dueAt);
  const { start } = parseTimeWindow(window);
  const [hours, minutes] = start.split(':').map(Number);
  const windowStart = due.hour(hours).minute(minutes).second(0);
  
  const diff = Math.abs(due.diff(windowStart, 'minute'));
  return diff <= toleranceMinutes;
}

