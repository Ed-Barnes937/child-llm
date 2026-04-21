import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useParentSession } from "@/queries/parent-auth";
import {
  useChildrenByParent,
  useChildConfig,
  useUpdateChild,
  useUpdatePreset,
} from "@/queries/children";
import {
  useParentSeededTopics,
  useCreateParentSeededTopic,
  useDeleteParentSeededTopic,
} from "@/queries/parent-seeded-topics";
import {
  PRESET_DEFINITIONS,
  type PresetName,
  type PresetSliders,
} from "@child-safe-llm/shared";
import PresetSelector from "@/components/dashboard/PresetSelector";
import SliderControls from "@/components/dashboard/SliderControls";
import InspireMeTopics from "@/components/dashboard/InspireMeTopics";

const ChildSettingsPage = () => {
  const navigate = useNavigate();
  const { childId } = Route.useParams();
  const { data: session, isPending } = useParentSession();
  const { data: kids } = useChildrenByParent(session?.user?.id);
  const { data: topics } = useParentSeededTopics(childId);
  const { data: childConfig } = useChildConfig(childId);

  const updateChildMutation = useUpdateChild();
  const updatePresetMutation = useUpdatePreset();
  const createTopicMutation = useCreateParentSeededTopic();
  const deleteTopicMutation = useDeleteParentSeededTopic();

  const child = kids?.find((c) => c.id === childId);

  // Track slider overrides separately from the saved/default values.
  const [sliderOverrides, setSliderOverrides] = useState<
    Partial<PresetSliders>
  >({});

  // Derive effective slider values: saved config > preset defaults, with local overrides on top
  const sliderValues = useMemo<PresetSliders | null>(() => {
    if (!child) return null;
    const preset = PRESET_DEFINITIONS[child.presetName as PresetName];
    if (!preset) return null;
    const base = childConfig?.sliders ?? preset.sliders;
    return { ...base, ...sliderOverrides };
  }, [child, childConfig, sliderOverrides]);

  // PIN reset state
  const [showPinReset, setShowPinReset] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinSaved, setPinSaved] = useState(false);

  // Preset saved state
  const [presetSaved, setPresetSaved] = useState(false);

  // Slider saved state
  const [slidersSaved, setSlidersSaved] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/parent/login" });
    }
  }, [isPending, session, navigate]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  if (!child) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground">Child not found.</p>
        <Link
          to="/parent/children"
          className="text-primary mt-2 inline-block text-sm underline"
        >
          Back to children
        </Link>
      </div>
    );
  }

  const handlePresetChange = (presetName: PresetName) => {
    setPresetSaved(false);
    updateChildMutation.mutate(
      { childId, data: { presetName } },
      {
        onSuccess: () => {
          // Reset slider overrides so sliders reflect new preset defaults
          setSliderOverrides({});
          setPresetSaved(true);
        },
      },
    );
  };

  const handleSliderChange = (key: keyof PresetSliders, value: number) => {
    setSliderOverrides((prev) => ({ ...prev, [key]: value }));
    setSlidersSaved(false);
  };

  const handleSliderCommit = (key: keyof PresetSliders, value: number) => {
    if (!sliderValues) return;
    const updated = { ...sliderValues, [key]: value };

    updatePresetMutation.mutate(
      { childId, sliders: updated },
      {
        onSuccess: () => setSlidersSaved(true),
      },
    );
  };

  const handleAddTopic = (topic: string) => {
    createTopicMutation.mutate({ childId, topic });
  };

  const handleDeleteTopic = (topicId: string) => {
    deleteTopicMutation.mutate({ childId, topicId });
  };

  const handlePinReset = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) return;
    setPinSaved(false);
    updateChildMutation.mutate(
      { childId, data: { pin: newPin } },
      {
        onSuccess: () => {
          setNewPin("");
          setShowPinReset(false);
          setPinSaved(true);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        to="/parent/children"
        className="text-muted-foreground mb-4 inline-block text-sm underline"
      >
        Back to children
      </Link>

      <h1 className="text-2xl font-bold">
        {child.displayName}&apos;s Settings
      </h1>

      <div className="mt-6 space-y-6">
        {/* Preset Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preset</CardTitle>
          </CardHeader>
          <CardContent>
            <PresetSelector
              value={child.presetName as PresetName}
              onChange={handlePresetChange}
              disabled={updateChildMutation.isPending}
            />
            {presetSaved && (
              <p className="text-sm text-green-600 mt-2">Preset saved</p>
            )}
          </CardContent>
        </Card>

        {/* Slider Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Guardrail Sliders</CardTitle>
          </CardHeader>
          <CardContent>
            {sliderValues ? (
              <>
                <SliderControls
                  values={sliderValues}
                  onChange={handleSliderChange}
                  onCommit={handleSliderCommit}
                  disabled={updatePresetMutation.isPending}
                />
                {slidersSaved && (
                  <p className="text-sm text-green-600 mt-2">Sliders saved</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Loading...</p>
            )}
          </CardContent>
        </Card>

        {/* Inspire Me Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inspire Me Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <InspireMeTopics
              topics={topics ?? []}
              onAdd={handleAddTopic}
              onDelete={handleDeleteTopic}
              isAdding={createTopicMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* PIN Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PIN Management</CardTitle>
          </CardHeader>
          <CardContent>
            {pinSaved && (
              <p className="text-sm text-green-600 mb-2">PIN updated</p>
            )}
            {!showPinReset ? (
              <Button
                variant="outline"
                onClick={() => {
                  setShowPinReset(true);
                  setPinSaved(false);
                }}
              >
                Reset PIN
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder="New 4-digit PIN"
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  aria-label="New PIN"
                />
                <Button
                  onClick={handlePinReset}
                  disabled={
                    newPin.length !== 4 || updateChildMutation.isPending
                  }
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPinReset(false);
                    setNewPin("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/parent/children/$childId")({
  component: ChildSettingsPage,
});
