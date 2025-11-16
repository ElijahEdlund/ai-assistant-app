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
 * Maps day 1-90 to the 2-week template using modulo logic
 */
export function getTrainingForDay(plan: WorkoutPlan | null, dayNumber: number): any {
  if (!plan?.plan?.template?.training) return null;
  
  // Map day number to template day index (1-14)
  const templateDayIndex = ((dayNumber - 1) % 14) + 1;
  const templateDays = plan.plan.template.training;
  
  // Find the template day
  const templateDay = templateDays.find((d: any) => d.dayIndex === templateDayIndex) || templateDays[templateDayIndex - 1];
  
  if (!templateDay) return null;
  
  // Return template day with dayNumber for compatibility
  return {
    ...templateDay,
    dayNumber, // Add dayNumber for backward compatibility
    isRestDay: !templateDay.isWorkoutDay,
    primaryFocus: templateDay.focus,
    exercises: templateDay.workout?.exercises || [],
  };
}

/**
 * Get nutrition data for a specific day number
 * Returns the daily macro targets (same for all days in the new structure)
 */
export function getNutritionForDay(plan: WorkoutPlan | null, dayNumber: number): any {
  if (!plan?.plan?.template?.nutrition?.dailyMacroTargets) return null;
  
  // In the new structure, all days have the same macro targets
  return {
    dayNumber,
    dayType: 'training', // Could be determined from training day if needed
    calories: plan.plan.template.nutrition.dailyMacroTargets.calories,
    proteinG: plan.plan.template.nutrition.dailyMacroTargets.proteinGrams,
    carbsG: plan.plan.template.nutrition.dailyMacroTargets.carbsGrams,
    fatsG: plan.plan.template.nutrition.dailyMacroTargets.fatsGrams,
    notes: plan.plan.template.nutrition.dailyMacroTargets.notes,
  };
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

