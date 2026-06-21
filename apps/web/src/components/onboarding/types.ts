import type {
  PresetName,
  PresetSliders,
  CalibrationAnswer,
} from "@child-safe-llm/shared";

export interface OnboardingData {
  displayName: string;
  presetName: PresetName;
  pin: string;
  calibrationAnswers: CalibrationAnswer[];
  sliderOverrides: Partial<PresetSliders>;
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  displayName: "",
  // Safe by default (6.5.9): a new child starts on the strictest preset.
  // The parent can deliberately relax it, but the default never opts them
  // into less protection than the most protective option.
  presetName: "early-learner",
  pin: "",
  calibrationAnswers: [],
  sliderOverrides: {},
};
