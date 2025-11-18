import { Assessment } from '../../lib/data/dataClient';

export interface PlanBlueprint {
  userProfile: {
    goal: string;
    trainingDaysPerWeek: number;
    sessionLengthMinutes: number;
    cardioPreference?: string;
    equipmentAccess?: string;
    injuries?: string[];
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    bodyGoals?: string[];
    age?: number;
    gender?: 'male' | 'female' | 'other';
    height_cm?: number;
    weight_kg?: number;
    activityLevel?: string;
    priorityAreas?: string;
  };
  programOverview: {
    title: string;
    primaryGoal: string;
    secondaryGoals: string[];
    summary: string; // short (2–4 sentences)
  };
  splitDesign: {
    microcycleLengthDays: number; // 7 or 14
    dayTypes: {
      id: string; // "upper_a", "lower_a", "cardio_a", "recovery_a", etc.
      label: string; // "Upper Strength A"
      category: 'strength' | 'hypertrophy' | 'conditioning' | 'recovery';
      focusDescription: string; // short description
      includesCardio: boolean;
      isRecoveryDay: boolean;
    }[];
    microcycleTemplate: {
      dayIndex: number; // 1..microcycleLengthDays
      dayTypeId: string; // references dayTypes.id
    }[];
    programLengthDays: number; // 90
  };
  nutritionOverview: {
    dailyMacros: {
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatsGrams: number;
    };
    sampleMeals: {
      name: string;
      description: string;
    }[];
    guidelines: string[]; // short bullets only here
  };
}

export interface PlanDetails {
  dayTypeDetails: {
    [dayTypeId: string]: {
      name: string;
      trainingFocus: string; // 1–2 sentences
      warmup: {
        description: string;
        steps: string[];
      };
      blocks: {
        title: string; // "Main Lifts", "Accessories", "Finisher"
        exercises: {
          name: string;
          equipment: string;
          sets: number;
          reps: string; // "6–8", "8–12", etc.
          restSeconds: number;
          tempo?: string;
          cues: string[];
          commonMistakes: string[];
          progressionTips: string[];
        }[];
      }[];
      cardioProtocol?: {
        isIncluded: boolean;
        description: string;
        exampleSessions: string[];
      };
      recoveryRoutine?: {
        isRecoveryDay: boolean;
        description: string;
        steps: string[];
        extraTips: string[];
      };
    };
  };
  globalCoachNotes: {
    howThisProgramWorks: string;
    phaseBreakdown: {
      phaseName: string;
      weeks: string; // e.g. "Weeks 1–4"
      focus: string;
      notes: string;
    }[];
    howToProgress: string;
    recoveryPhilosophy: string;
    cardioAndConditioningApproach: string;
    nutritionStrategy: string;
  };
}

export interface FullPlan {
  blueprint: PlanBlueprint;
  details: PlanDetails;
}

export interface PlanBlueprintRequest {
  assessment: Assessment;
}

export interface PlanDetailsRequest {
  assessment: Assessment;
  blueprint: PlanBlueprint;
}

