import dayjs from 'dayjs';
import { WorkoutPlan } from '../data/dataClient';

/**
 * Calculate the day number (1-90) for a given date based on program start date
 */
export function getDayNumber(plan: WorkoutPlan | null, date: string): number | null {
  if (!plan?.program_start_date) return null;
  
  const startDate = dayjs(plan.program_start_date);
  const targetDate = dayjs(date);
  const daysDiff = targetDate.diff(startDate, 'day');
  
  if (daysDiff < 0 || daysDiff >= 90) return null;
  return daysDiff + 1; // Day 1 is the start date
}

/**
 * Get the date for a specific day number (1-90)
 */
export function getDateForDayNumber(plan: WorkoutPlan | null, dayNumber: number): string | null {
  if (!plan?.program_start_date || dayNumber < 1 || dayNumber > 90) return null;
  
  const startDate = dayjs(plan.program_start_date);
  return startDate.add(dayNumber - 1, 'day').format('YYYY-MM-DD');
}

/**
 * Get training data for a specific day number
 */
export function getTrainingForDay(plan: WorkoutPlan | null, dayNumber: number): any {
  if (!plan?.plan?.training?.weeks) return null;
  
  for (const week of plan.plan.training.weeks) {
    const day = week.days?.find((d: any) => d.dayNumber === dayNumber);
    if (day) return day;
  }
  return null;
}

/**
 * Get nutrition data for a specific day number
 */
export function getNutritionForDay(plan: WorkoutPlan | null, dayNumber: number): any {
  if (!plan?.plan?.nutrition?.days) return null;
  
  return plan.plan.nutrition.days.find((d: any) => d.dayNumber === dayNumber) || null;
}

/**
 * Get all dates in the 90-day program range
 */
export function getProgramDateRange(plan: WorkoutPlan | null): { start: string; end: string } | null {
  if (!plan?.program_start_date) return null;
  
  const start = plan.program_start_date;
  const end = dayjs(start).add(89, 'day').format('YYYY-MM-DD');
  return { start, end };
}

/**
 * Check if a date is within the 90-day program range
 */
export function isDateInProgram(plan: WorkoutPlan | null, date: string): boolean {
  const range = getProgramDateRange(plan);
  if (!range) return false;
  
  const targetDate = dayjs(date);
  return targetDate.isSameOrAfter(range.start, 'day') && targetDate.isSameOrBefore(range.end, 'day');
}

