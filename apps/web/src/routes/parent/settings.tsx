import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useParentSession } from "@/queries/parent-auth";

const NOTIFICATIONS_STORAGE_KEY = "app-settings-notifications";
const THEME_STORAGE_KEY = "app-settings-theme";

interface NotificationPreferences {
  flagNotifications: boolean;
  sessionLimitNotifications: boolean;
}

interface ThemePreferences {
  darkMode: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  flagNotifications: true,
  sessionLimitNotifications: true,
};

const DEFAULT_THEME: ThemePreferences = {
  darkMode: false,
};

const loadNotificationPrefs = (): NotificationPreferences => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_NOTIFICATIONS;
};

const loadThemePrefs = (): ThemePreferences => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_THEME, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_THEME;
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useParentSession();

  const [notifications, setNotifications] = useState<NotificationPreferences>(
    loadNotificationPrefs,
  );
  const [theme, setTheme] = useState<ThemePreferences>(loadThemePrefs);

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/parent/login" });
    }
  }, [isPending, session, navigate]);

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications),
    );
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    if (theme.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        to="/parent/dashboard"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Back to dashboard
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground mt-1">
        Manage your notification, display, and privacy preferences.
      </p>

      <div className="mt-8 space-y-6">
        {/* Notification preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Notification preferences</CardTitle>
            <CardDescription>
              Choose which notifications you receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label
                className="cursor-pointer"
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    flagNotifications: !prev.flagNotifications,
                  }))
                }
              >
                Flag notifications
              </Label>
              <Switch
                aria-label="Flag notifications"
                checked={notifications.flagNotifications}
                onCheckedChange={(checked: boolean) =>
                  setNotifications((prev) => ({
                    ...prev,
                    flagNotifications: checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label
                className="cursor-pointer"
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    sessionLimitNotifications: !prev.sessionLimitNotifications,
                  }))
                }
              >
                Session limit notifications
              </Label>
              <Switch
                aria-label="Session limit notifications"
                checked={notifications.sessionLimitNotifications}
                onCheckedChange={(checked: boolean) =>
                  setNotifications((prev) => ({
                    ...prev,
                    sessionLimitNotifications: checked,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Display preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Display preferences</CardTitle>
            <CardDescription>Customise the app appearance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label
                className="cursor-pointer"
                onClick={() =>
                  setTheme((prev) => ({
                    ...prev,
                    darkMode: !prev.darkMode,
                  }))
                }
              >
                Dark mode
              </Label>
              <Switch
                aria-label="Dark mode"
                checked={theme.darkMode}
                onCheckedChange={(checked: boolean) =>
                  setTheme((prev) => ({ ...prev, darkMode: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal links */}
        <Card>
          <CardHeader>
            <CardTitle>Legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="#"
              className="text-primary hover:underline block text-sm"
              aria-label="Privacy Policy"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-primary hover:underline block text-sm"
              aria-label="Terms of Service"
            >
              Terms of Service
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/parent/settings")({
  component: SettingsPage,
});
