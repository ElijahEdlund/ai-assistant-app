import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAssessmentStore } from '../../../lib/state/assessment';

export default function AssessmentIndex() {
  const router = useRouter();
  const { assessment } = useAssessmentStore();

  useEffect(() => {
    // Redirect to first question
    if (!assessment?.age) {
      router.replace('/onboarding/assessment/q-age');
    } else if (!assessment?.weight_kg) {
      router.replace('/onboarding/assessment/q-weight');
    } else if (!assessment?.height_cm) {
      router.replace('/onboarding/assessment/q-height');
    } else if (!assessment?.gender) {
      router.replace('/onboarding/assessment/q-gender');
    } else if (!assessment?.goals || assessment.goals.length === 0) {
      router.replace('/onboarding/assessment/q-goals');
    } else if (!assessment?.goal_description || assessment.goal_description.trim().length === 0) {
      router.replace('/onboarding/assessment/q-goal-description');
    } else if (assessment.has_equipment === undefined || assessment.has_equipment === null) {
      router.replace('/onboarding/assessment/q-equipment');
    } else if (!assessment?.weekly_days) {
      router.replace('/onboarding/assessment/q-time');
    } else if (!assessment?.daily_minutes) {
      router.replace('/onboarding/assessment/q-hours');
    } else {
      router.replace('/onboarding/assessment/done');
    }
  }, [assessment, router]);

  return null;
}

