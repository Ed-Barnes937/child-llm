import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParentSession } from "@/queries/parent-auth";
import { useCreateChild } from "@/queries/children";
import OnboardingStep1 from "@/components/onboarding/OnboardingStep1";
import OnboardingStep2 from "@/components/onboarding/OnboardingStep2";
import OnboardingStep3 from "@/components/onboarding/OnboardingStep3";
import {
  INITIAL_ONBOARDING_DATA,
  type OnboardingData,
} from "@/components/onboarding/types";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useParentSession();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
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

  const updateData = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const handleSubmit = () => {
    setError("");

    if (!session?.user?.id) {
      setError("You must be logged in.");
      return;
    }

    createChildMutation.mutate(
      {
        parentId: session.user.id,
        displayName: data.displayName,
        presetName: data.presetName,
        pin: data.pin,
        sliderOverrides:
          Object.keys(data.sliderOverrides).length > 0
            ? data.sliderOverrides
            : undefined,
        calibrationAnswers:
          data.calibrationAnswers.length > 0
            ? data.calibrationAnswers
            : undefined,
      },
      {
        onError: () =>
          setError("Failed to create child account. Please try again."),
      },
    );
  };

  // Success screen
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
      {step === 0 && (
        <OnboardingStep1
          data={data}
          onNext={(partial) => {
            updateData(partial);
            setStep(1);
          }}
        />
      )}

      {step === 1 && (
        <OnboardingStep2
          data={data}
          onNext={(partial) => {
            updateData(partial);
            setStep(2);
          }}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <>
          <OnboardingStep3
            data={data}
            onSubmit={handleSubmit}
            onBack={() => setStep(1)}
            onEdit={(targetStep) => setStep(targetStep)}
            onSliderChange={(overrides) =>
              updateData({ sliderOverrides: overrides })
            }
            isSubmitting={createChildMutation.isPending}
          />
          {error && (
            <p className="text-destructive mt-2 text-center text-sm">{error}</p>
          )}
        </>
      )}
    </div>
  );
};

export const Route = createFileRoute("/parent/onboarding")({
  component: OnboardingPage,
});
