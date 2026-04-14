import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { childAuthApi } from "@/api/child-auth";
import {
  getDeviceToken,
  setDeviceToken,
  generateDeviceToken,
} from "@/lib/device-token";
import { setChildSession } from "@/lib/child-session";
import { useChildrenByDevice } from "@/queries/children";

interface ChildProfile {
  id: string;
  displayName: string;
  presetName: string;
}

const ChildLoginPage = () => {
  const navigate = useNavigate();
  const [deviceToken, setDeviceTokenState] = useState<string | null>(() =>
    getDeviceToken(),
  );
  const [modeOverride, setModeOverride] = useState<"pin" | "password" | null>(
    null,
  );
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);

  // PIN mode state
  const [pin, setPin] = useState("");

  // Password mode state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: deviceResult, isLoading: loadingProfiles } =
    useChildrenByDevice(deviceToken);
  const profiles = (deviceResult?.children ?? []) as ChildProfile[];

  // Derive the current mode from query state + user interactions
  const mode: "profiles" | "pin" | "password" = modeOverride
    ? modeOverride
    : !deviceToken || (!loadingProfiles && profiles.length === 0)
      ? "password"
      : "profiles";

  const handleSelectChild = (child: ChildProfile) => {
    setSelectedChild(child);
    setPin("");
    setError("");
    setModeOverride("pin");
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !deviceToken) return;
    setError("");
    setLoading(true);

    const result = await childAuthApi.loginWithPin({
      childId: selectedChild.id,
      pin,
      deviceToken,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.child) {
      setChildSession(result.child);
      navigate({ to: "/child/home" });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = deviceToken ?? generateDeviceToken();

    const result = await childAuthApi.loginWithPassword({
      username,
      password,
      deviceToken: token,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.child) {
      setDeviceToken(token);
      setDeviceTokenState(token);
      setChildSession(result.child);
      navigate({ to: "/child/home" });
    }
  };

  if (loadingProfiles) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Profile selector (known device)
  if (mode === "profiles" && profiles.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back!</CardTitle>
            <CardDescription>Pick your name to get started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profiles.map((child) => (
              <button
                key={child.id}
                onClick={() => handleSelectChild(child)}
                className="border-border hover:border-primary/50 hover:bg-muted/50 w-full rounded-lg border p-4 text-left transition-colors"
              >
                <p className="text-lg font-medium">{child.displayName}</p>
                <p className="text-muted-foreground text-sm capitalize">
                  {child.presetName.replace(/-/g, " ")}
                </p>
              </button>
            ))}
            <div className="pt-2 text-center">
              <button
                onClick={() => setModeOverride("password")}
                className="text-muted-foreground text-sm underline underline-offset-4"
              >
                Log in with username instead
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PIN entry (known device, child selected)
  if (mode === "pin" && selectedChild) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Hi, {selectedChild.displayName}!
            </CardTitle>
            <CardDescription>Enter your PIN.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="****"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="text-center text-2xl tracking-[0.5em]"
                autoFocus
                required
              />

              {error && (
                <p className="text-destructive text-center text-sm">{error}</p>
              )}

              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Checking..." : "Go"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setModeOverride(null);
                  setError("");
                }}
                className="text-muted-foreground text-sm underline underline-offset-4"
              >
                Not you? Pick a different name
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Username + password (new device)
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>Enter your username and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              <Link
                to="/"
                className="text-primary underline underline-offset-4"
              >
                Back to home
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/child/login")({
  component: ChildLoginPage,
});
