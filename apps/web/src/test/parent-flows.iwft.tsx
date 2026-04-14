import { test, expect } from "./fixtures.testHelper";
import IwftApp from "./IwftApp";

test.describe("Parent signup and login", () => {
  test("parent can register a new account", async ({ mount, page, backendSimulator }) => {
    const component = await mount(<IwftApp initialPath="/parent/register" />);
    await backendSimulator.install(page);

    await component.getByLabel("Your name").fill("Test Parent");
    await component.getByLabel("Email").fill("parent@test.com");
    await component.getByLabel("Password", { exact: true }).fill("testpassword123");
    await component.getByLabel("Confirm password").fill("testpassword123");
    await component.getByRole("button", { name: "Create account" }).click();

    // After signup, navigates to onboarding which checks session via cookie
    await expect(page.getByText("Add a child")).toBeVisible({ timeout: 10000 });
  });

  test("parent can log in with existing account", async ({ mount, page, backendSimulator }) => {
    const component = await mount(<IwftApp initialPath="/parent/login" />);
    await backendSimulator.install(page);

    // Pre-seed a parent
    backendSimulator.db.createParent({
      name: "Test Parent",
      email: "parent@test.com",
      password: "testpassword123",
    });

    await component.getByLabel("Email").fill("parent@test.com");
    await component.getByLabel("Password").fill("testpassword123");
    await component.getByRole("button", { name: "Log in" }).click();

    // Login creates a session + cookie; dashboard loads session via get-session
    await expect(page.getByText("Welcome, Test Parent")).toBeVisible({ timeout: 10000 });
  });

  test("login fails with wrong password", async ({ mount, page, backendSimulator }) => {
    const component = await mount(<IwftApp initialPath="/parent/login" />);
    await backendSimulator.install(page);

    backendSimulator.db.createParent({
      name: "Test Parent",
      email: "parent@test.com",
      password: "testpassword123",
    });

    await component.getByLabel("Email").fill("parent@test.com");
    await component.getByLabel("Password").fill("wrongpassword");
    await component.getByRole("button", { name: "Log in" }).click();

    // Should stay on login page
    await expect(component.getByRole("button", { name: "Log in" })).toBeVisible();
  });
});

test.describe("Create child via onboarding", () => {
  test("parent can create a child account with preset and PIN", async ({ mount, page, backendSimulator }) => {
    // Start on register, go through full flow
    const component = await mount(<IwftApp initialPath="/parent/register" />);
    await backendSimulator.install(page);

    await component.getByLabel("Your name").fill("Test Parent");
    await component.getByLabel("Email").fill("parent@test.com");
    await component.getByLabel("Password", { exact: true }).fill("testpassword123");
    await component.getByLabel("Confirm password").fill("testpassword123");
    await component.getByRole("button", { name: "Create account" }).click();

    // Wait for onboarding form
    await expect(page.getByLabel("Child's name")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Child's name").fill("Alex");
    await page.getByText("Early learner").click();
    await page.getByLabel("4-digit PIN").fill("1234");
    await page.getByRole("button", { name: "Create child account" }).click();

    // Should show success
    await expect(page.getByText("Alex's account is ready!")).toBeVisible();

    // Username should start with "alex" and have 4 digits
    const username = await page.locator(".font-mono").first().textContent();
    expect(username).toMatch(/^alex\d{4}$/);

    // Navigate to dashboard
    await page.getByRole("button", { name: "Go to dashboard" }).click();

    // Should show dashboard with the child listed
    await expect(page.getByText("Parent Dashboard")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Early learner")).toBeVisible();
    await expect(page.getByText(username!)).toBeVisible();
  });
});
