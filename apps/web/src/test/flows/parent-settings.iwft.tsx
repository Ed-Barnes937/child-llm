import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";

test.describe("Parent settings page", () => {
  test("settings page renders with all sections when authenticated", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const parent = backendSimulator.db.createParent({
      name: "Test Parent",
      email: "parent@test.com",
      password: "pass",
    });
    const session = backendSimulator.db.createSession(parent.id);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/settings" />);

    // Page heading
    await expect(page.getByText("Settings")).toBeVisible({ timeout: 10000 });

    // Back link
    await expect(page.getByText("Back to dashboard")).toBeVisible();

    // Notification preferences section
    await expect(page.getByText("Notification preferences")).toBeVisible();
    await expect(page.getByText("Flag notifications")).toBeVisible();
    await expect(page.getByText("Session limit notifications")).toBeVisible();

    // Display preferences section
    await expect(page.getByText("Display preferences")).toBeVisible();
    await expect(page.getByText("Dark mode")).toBeVisible();

    // Legal section
    await expect(page.getByText("Legal")).toBeVisible();
    await expect(page.getByText("Privacy Policy")).toBeVisible();
    await expect(page.getByText("Terms of Service")).toBeVisible();
  });

  test("toggling a notification preference persists to localStorage", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    await backendSimulator.install(page);

    const parent = backendSimulator.db.createParent({
      name: "Test Parent",
      email: "parent@test.com",
      password: "pass",
    });
    const session = backendSimulator.db.createSession(parent.id);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/settings" />);

    await expect(page.getByText("Settings")).toBeVisible({ timeout: 10000 });

    // Find the flag notifications switch and verify it is present
    const flagSwitch = page.getByRole("switch", { name: "Flag notifications" });
    await expect(flagSwitch).toHaveCount(1);

    // Default state: checked
    await expect(flagSwitch).toHaveAttribute("aria-checked", "true");

    // Click the switch via JS — Playwright CT considers small inline elements
    // outside the viewport despite being rendered in the document.
    await flagSwitch.evaluate((el: HTMLElement) => el.click());

    // Verify localStorage was updated
    const stored = await page.evaluate(() =>
      localStorage.getItem("app-settings-notifications"),
    );
    const parsed = JSON.parse(stored!);
    expect(parsed.flagNotifications).toBe(false);
    expect(parsed.sessionLimitNotifications).toBe(true);

    // Toggle it back on
    await flagSwitch.evaluate((el: HTMLElement) => el.click());

    const stored2 = await page.evaluate(() =>
      localStorage.getItem("app-settings-notifications"),
    );
    const parsed2 = JSON.parse(stored2!);
    expect(parsed2.flagNotifications).toBe(true);
  });

  test("settings persist across page navigations", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const parent = backendSimulator.db.createParent({
      name: "Test Parent",
      email: "parent@test.com",
      password: "pass",
    });
    const session = backendSimulator.db.createSession(parent.id);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    // Pre-set localStorage to simulate a previous toggle
    await page.evaluate(() => {
      localStorage.setItem(
        "app-settings-notifications",
        JSON.stringify({
          flagNotifications: false,
          sessionLimitNotifications: true,
        }),
      );
    });

    await mount(<IwftApp initialPath="/parent/settings" />);

    await expect(page.getByText("Settings")).toBeVisible({ timeout: 10000 });

    // The flag notifications switch should reflect the persisted "off" state
    const flagSwitch = page.getByRole("switch", { name: "Flag notifications" });
    await expect(flagSwitch).toHaveAttribute("aria-checked", "false");
  });
});
