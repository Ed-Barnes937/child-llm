import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParentSession } from "@/queries/parent-auth";
import { useCreateChild } from "@/queries/children";
import type { PresetName } from "@child-safe-llm/shared";

const PRESETS: { name: PresetName; label: string; description: string }[] = [
  {
    name: "early-learner",
    label: "Early learner",
    description:
      "Ages 4-7. Simple vocabulary, short answers, structured interactions. Gentle and encouraging.",
  },
  {
    name: "confident-reader",
    label: "Confident reader",
    description:
      "Ages 7-10. Broader vocabulary, more detailed answers, can ask follow-up questions freely.",
  },
  {
    name: "independent-explorer",
    label: "Independent explorer",
    description:
      "Ages 10-13. Full vocabulary, in-depth explanations, freeform conversations with lighter guardrails.",
  },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useParentSession();
  const [displayName, setDisplayName] = useState("");
  const [selectedPreset, setSelectedPreset] =
    useState<PresetName>("confident-reader");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const createChildMutation = useCreateChild();
  const result = createChildMutation.data?.child ?? null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!session?.user?.id) {
      setError("You must be logged in.");
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    createChildMutation.mutate(
      {
        parentId: session.user.id,
        displayName,
        presetName: selectedPreset,
        pin,
      },
      {
        onError: () =>
          setError("Failed to create child account. Please try again."),
      },
    );
  };

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {result.displayName}&apos;s account is ready!
            </CardTitle>
            <CardDescription>
              Here are the details you&apos;ll need.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono font-bold">{result.username}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Password</span>
                <span className="font-mono font-bold">{result.username}</span>
              </div>
            </div>
            <p className="text-muted-foreground text-center text-sm">
              On a new device, your child logs in with their username and
              password. On a shared family device, they just pick their name and
              enter their PIN.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate({ to: "/parent/dashboard" })}
            >
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Add a child</CardTitle>
          <CardDescription>
            Give them a name, pick a starting preset, and set a PIN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Child&apos;s name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="e.g. Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Preset</Label>
              <div className="grid gap-2">
                {PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.name}
                    onClick={() => setSelectedPreset(preset.name)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selectedPreset === preset.name
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium">{preset.label}</p>
                    <p className="text-muted-foreground text-sm">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pin">4-digit PIN</Label>
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="e.g. 1234"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                required
              />
              <p className="text-muted-foreground text-xs">
                Your child will use this PIN to log in on shared devices.
              </p>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button
              type="submit"
              size="lg"
              disabled={createChildMutation.isPending}
            >
              {createChildMutation.isPending
                ? "Creating account..."
                : "Create child account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/parent/onboarding")({
  component: OnboardingPage,
});
