import { test, expect, type Page } from "@playwright/test";
import { resetDb } from "./helpers";

// Wait for React hydration after SSR navigation
async function waitForHydration(page: Page) {
  await page.waitForLoadState("networkidle");
}

test.beforeEach(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await resetDb();
});

test.describe("Parent signup and login", () => {
  test("parent can register a new account", async ({ page }) => {
    await page.goto("/parent/register");
    await waitForHydration(page);

    await page.getByLabel("Your name").fill("Test Parent");
    await page.getByLabel("Email").fill("parent@test.com");
    await page.getByLabel("Password", { exact: true }).fill("testpassword123");
    await page.getByLabel("Confirm password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();

    // Should redirect to onboarding
    await expect(page).toHaveURL("/parent/onboarding");
  });

  test("parent can log in with existing account", async ({ page }) => {
    // Register first
    await page.goto("/parent/register");
    await waitForHydration(page);
    await page.getByLabel("Your name").fill("Test Parent");
    await page.getByLabel("Email").fill("parent@test.com");
    await page.getByLabel("Password", { exact: true }).fill("testpassword123");
    await page.getByLabel("Confirm password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/parent/onboarding");

    // Log out by clearing cookies and going to login
    await page.context().clearCookies();
    await page.goto("/parent/login");
    await waitForHydration(page);

    await page.getByLabel("Email").fill("parent@test.com");
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/parent/dashboard");
    await expect(page.getByText("Welcome, Test Parent")).toBeVisible();
  });

  test("login fails with wrong password", async ({ page }) => {
    // Register
    await page.goto("/parent/register");
    await waitForHydration(page);
    await page.getByLabel("Your name").fill("Test Parent");
    await page.getByLabel("Email").fill("parent@test.com");
    await page.getByLabel("Password", { exact: true }).fill("testpassword123");
    await page.getByLabel("Confirm password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/parent/onboarding");

    // Try to login with wrong password
    await page.context().clearCookies();
    await page.goto("/parent/login");
    await waitForHydration(page);
    await page.getByLabel("Email").fill("parent@test.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();

    // Should stay on login page with error
    await expect(page).toHaveURL("/parent/login");
  });
});

test.describe("Create child via onboarding", () => {
  test("parent can create a child account with preset and PIN", async ({
    page,
  }) => {
    // Register parent
    await page.goto("/parent/register");
    await waitForHydration(page);
    await page.getByLabel("Your name").fill("Test Parent");
    await page.getByLabel("Email").fill("parent@test.com");
    await page.getByLabel("Password", { exact: true }).fill("testpassword123");
    await page.getByLabel("Confirm password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/parent/onboarding");
    await waitForHydration(page);

    // Fill onboarding
    await page.getByLabel("Child's name").fill("Alex");
    await page.getByText("Early learner").click();
    await page.getByLabel("4-digit PIN").fill("1234");
    await page.getByRole("button", { name: "Create child account" }).click();

    // Should show success with credentials
    await expect(page.getByText("Alex's account is ready!")).toBeVisible();

    // Username should start with "alex" and have 4 digits
    const username = await page.locator(".font-mono").first().textContent();
    expect(username).toMatch(/^alex\d{4}$/);

    // Navigate to dashboard and verify child appears
    await page.getByRole("button", { name: "Go to dashboard" }).click();
    await expect(page).toHaveURL("/parent/dashboard");
    await expect(page.getByText("Parent Dashboard")).toBeVisible();
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Early learner")).toBeVisible();
    await expect(page.getByText(username!)).toBeVisible();
  });
});

test.describe("Child login", () => {
  // Helper: register parent + create child, returns child username
  async function setupParentAndChild(page: Page) {
    await page.goto("/parent/register");
    await waitForHydration(page);
    await page.getByLabel("Your name").fill("Test Parent");
    await page.getByLabel("Email").fill("parent@test.com");
    await page.getByLabel("Password", { exact: true }).fill("testpassword123");
    await page.getByLabel("Confirm password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/parent/onboarding");
    await waitForHydration(page);

    await page.getByLabel("Child's name").fill("Alex");
    await page.getByText("Confident reader").click();
    await page.getByLabel("4-digit PIN").fill("5678");
    await page.getByRole("button", { name: "Create child account" }).click();

    await expect(page.getByText("Alex's account is ready!")).toBeVisible();
    const username = await page.locator(".font-mono").first().textContent();
    return username!;
  }

  test("child can log in with username + password on new device", async ({
    page,
  }) => {
    const username = await setupParentAndChild(page);

    // Clear everything to simulate a new device
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto("/child/login");
    await waitForHydration(page);
    // On a new device with no device token, should show username/password form
    await page.getByLabel("Username").fill(username);
    // Password is same as username for tracer bullet
    await page.getByLabel("Password").fill(username);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/child/home");
    await expect(page.getByText("Hi, Alex!")).toBeVisible();
  });

  test("child can log in with PIN on known device", async ({ page }) => {
    const username = await setupParentAndChild(page);

    // First, log in with password to register the device
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/child/login");
    await waitForHydration(page);
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(username);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/child/home");

    // Now clear child session but keep device token
    await page.evaluate(() =>
      localStorage.removeItem("child-safe-llm-child-session"),
    );

    // Go to child login — should show profile selector since device is known
    await page.goto("/child/login");
    await waitForHydration(page);
    await expect(page.getByText("Alex")).toBeVisible();

    // Click the child's name
    await page.getByText("Alex").click();

    // Should show PIN entry
    await expect(page.getByText("Hi, Alex!")).toBeVisible();
    await page.getByPlaceholder("****").fill("5678");
    await page.getByRole("button", { name: "Go" }).click();

    await expect(page).toHaveURL("/child/home");
  });
});

test.describe("Chat", () => {
  test("child can send a message and receive a streamed response", async ({
    page,
  }) => {
    // Setup parent + child
    await page.goto("/parent/register");
    await waitForHydration(page);
    await page.getByLabel("Your name").fill("Test Parent");
    await page.getByLabel("Email").fill("parent@test.com");
    await page.getByLabel("Password", { exact: true }).fill("testpassword123");
    await page.getByLabel("Confirm password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/parent/onboarding");
    await waitForHydration(page);

    await page.getByLabel("Child's name").fill("Alex");
    await page.getByText("Confident reader").click();
    await page.getByLabel("4-digit PIN").fill("1234");
    await page.getByRole("button", { name: "Create child account" }).click();
    const username = await page.locator(".font-mono").first().textContent();

    // Login as child
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/child/login");
    await waitForHydration(page);
    await page.getByLabel("Username").fill(username!);
    await page.getByLabel("Password").fill(username!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/child/home");

    // Start a new conversation
    await page.getByText("Start a new conversation").click();
    await expect(page).toHaveURL("/child/chat/new");
    await waitForHydration(page);

    // Send a message
    await page.getByPlaceholder("Type a message...").fill("What is the sun?");
    await page.getByRole("button", { name: "Send" }).click();

    // Should see child's message in a bubble
    await expect(page.getByText("What is the sun?")).toBeVisible();

    // Should receive an AI response (wait up to 30s for streaming from OpenRouter)
    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 15000 });

    // Wait for actual content (not the "..." placeholder)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="ai-message"] p');
        return (
          el &&
          el.textContent &&
          el.textContent.length > 10 &&
          el.textContent !== "..."
        );
      },
      { timeout: 30000 },
    );

    const responseText = await aiMessage.locator("p").textContent();
    expect(responseText!.length).toBeGreaterThan(10);
  });
});
