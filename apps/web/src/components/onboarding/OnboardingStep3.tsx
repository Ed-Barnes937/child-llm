import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PRESET_DEFINITIONS,
  SLIDER_LABELS,
  CALIBRATION_QUESTIONS,
  type PresetSliders,
} from "@child-safe-llm/shared";
import type { OnboardingData } from "./types";

interface OnboardingStep3Props {
  data: OnboardingData;
  onSubmit: () => void;
  onBack: () => void;
  onEdit: (step: number) => void;
  onSliderChange: (overrides: Partial<PresetSliders>) => void;
  isSubmitting: boolean;
}

const SLIDER_KEYS: (keyof PresetSliders)[] = [
  "vocabularyLevel",
  "responseDepth",
  "answeringStyle",
  "interactionMode",
  "topicAccess",
  "sessionLimits",
  "parentVisibility",
];

const OnboardingStep3 = ({
  data,
  onSubmit,
  onBack,
  onEdit,
  onSliderChange,
  isSubmitting,
}: OnboardingStep3Props) => {
  const [showSliders, setShowSliders] = useState(false);
  const preset = PRESET_DEFINITIONS[data.presetName];
  const effectiveSliders = { ...preset.sliders, ...data.sliderOverrides };
  const hasCalibration = data.calibrationAnswers.length > 0;

  const handleSliderValueChange = (
    key: keyof PresetSliders,
    value: number | readonly number[],
  ) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    const presetDefault = preset.sliders[key];
    const currentOverrides = { ...data.sliderOverrides };

    if (newValue === presetDefault) {
      delete currentOverrides[key];
    } else {
      currentOverrides[key] = newValue;
    }

    onSliderChange(currentOverrides);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Review & confirm</CardTitle>
        <CardDescription>
          Check everything looks right before creating {data.displayName}&apos;s
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Child name */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Name</p>
            <p className="font-medium">{data.displayName}</p>
          </div>
          <button
            type="button"
            onClick={() => onEdit(0)}
            className="text-primary text-sm underline"
          >
            Edit
          </button>
        </div>

        {/* Preset */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Preset</p>
            <p className="font-medium">{preset.label}</p>
          </div>
          <button
            type="button"
            onClick={() => onEdit(0)}
            className="text-primary text-sm underline"
          >
            Edit
          </button>
        </div>

        {/* PIN */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">PIN</p>
            <p className="font-mono font-medium">
              {"*".repeat(data.pin.length)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEdit(0)}
            className="text-primary text-sm underline"
          >
            Edit
          </button>
        </div>

        {/* Calibration summary */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">
              Sensitive topic calibration
            </p>
            <p className="font-medium">
              {hasCalibration
                ? `${data.calibrationAnswers.length} of ${CALIBRATION_QUESTIONS.length} questions answered`
                : "Skipped — using defaults"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEdit(1)}
            className="text-primary text-sm underline"
          >
            Edit
          </button>
        </div>

        {/* Slider customisation (collapsed by default) */}
        <div className="border-border rounded-lg border">
          <button
            type="button"
            onClick={() => setShowSliders(!showSliders)}
            className="flex w-full items-center justify-between p-3 text-left"
          >
            <span className="text-sm font-medium">
              Customise guardrail sliders
            </span>
            <span className="text-muted-foreground text-sm">
              {showSliders ? "Hide" : "Show"}
            </span>
          </button>

          {showSliders && (
            <div className="flex flex-col gap-4 border-t px-3 pb-4 pt-3">
              {SLIDER_KEYS.map((key) => {
                const meta = SLIDER_LABELS[key];
                const value = effectiveSliders[key];
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {meta.label}
                      </label>
                      <span className="text-muted-foreground text-xs">
                        {value} / 5
                      </span>
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[value]}
                      onValueChange={(newValue) =>
                        handleSliderValueChange(key, newValue)
                      }
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>{meta.low}</span>
                      <span>{meta.high}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Creating account..."
              : `Create ${data.displayName}'s account`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingStep3;
