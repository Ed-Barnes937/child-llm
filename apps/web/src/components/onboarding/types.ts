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
  presetName: "confident-reader",
  pin: "",
  calibrationAnswers: [],
  sliderOverrides: {},
};
