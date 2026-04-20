import { Slider } from "@/components/ui/slider";
import { SLIDER_LABELS, type PresetSliders } from "@child-safe-llm/shared";

const SLIDER_KEYS: (keyof PresetSliders)[] = [
  "vocabularyLevel",
  "responseDepth",
  "answeringStyle",
  "interactionMode",
  "topicAccess",
  "sessionLimits",
  "parentVisibility",
];

interface SliderControlsProps {
  values: PresetSliders;
  onChange: (key: keyof PresetSliders, value: number) => void;
  disabled?: boolean;
}

const SliderControls = ({
  values,
  onChange,
  disabled,
}: SliderControlsProps) => {
  return (
    <div className="flex flex-col gap-4">
      {SLIDER_KEYS.map((key) => {
        const meta = SLIDER_LABELS[key];
        const value = values[key];
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{meta.label}</label>
              <span className="text-muted-foreground text-xs">{value} / 5</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[value]}
              disabled={disabled}
              onValueChange={(newValue) => {
                const num = Array.isArray(newValue) ? newValue[0] : newValue;
                onChange(key, num);
              }}
            />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{meta.low}</span>
              <span>{meta.high}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SliderControls;
