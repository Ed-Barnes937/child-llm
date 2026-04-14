import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";

test.describe("Parent signup and login", () => {
  test("parent can register a new account", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const component = await mount(<IwftApp initialPath="/parent/register" />);
    await backendSimulator.install(page);

    await component.getByLabel("Your name").fill("Test Parent");
    await component.getByLabel("Email").fill("parent@test.com");
    await component
      .getByLabel("Password", { exact: true })
      .fill("testpassword123");
    await component.getByLabel("Confirm password").fill("testpassword123");
    await component.getByRole("button", { name: "Create account" }).click();

    // After signup, navigates to onboarding which checks session via cookie
    await expect(page.getByText("Add a child")).toBeVisible({ timeout: 10000 });
  });

  test("parent can log in with existing account", async ({
    mount,
    page,
    backendSimulator,
  }) => {
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
    await expect(page.getByText("Welcome, Test Parent")).toBeVisible({
      timeout: 10000,
    });
  });

  test("login fails with wrong password", async ({
    mount,
    page,
    backendSimulator,
  }) => {
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
    await expect(
      component.getByRole("button", { name: "Log in" }),
    ).toBeVisible();
  });
});

test.describe("Create child via onboarding", () => {
  test("parent can create a child through full onboarding wizard", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    // Start on register, go through full flow
    const component = await mount(<IwftApp initialPath="/parent/register" />);
    await backendSimulator.install(page);

    await component.getByLabel("Your name").fill("Test Parent");
    await component.getByLabel("Email").fill("parent@test.com");
    await component
      .getByLabel("Password", { exact: true })
      .fill("testpassword123");
    await component.getByLabel("Confirm password").fill("testpassword123");
    await component.getByRole("button", { name: "Create account" }).click();

    // Step 1: Child name, preset, PIN
    await expect(page.getByLabel("Child's name")).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Child's name").fill("Alex");
    await page.getByText("Early learner").click();
    await page.getByLabel("4-digit PIN").fill("1234");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Calibration — skip
    await expect(page.getByText("Sensitive topic calibration")).toBeVisible();
    await page.getByText("Skip calibration").click();

    // Step 3: Review & confirm
    await expect(page.getByText("Review & confirm")).toBeVisible();
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Early learner")).toBeVisible();
    await expect(page.getByText("Skipped — using defaults")).toBeVisible();
    await page.getByRole("button", { name: "Create Alex's account" }).click();

    // Should show success
    await expect(page.getByText("Alex's account is ready!")).toBeVisible();

    const username = await page.locator(".font-mono").first().textContent();
    expect(username).toMatch(/^alex\d{4}$/);

    await page.getByRole("button", { name: "Go to dashboard" }).click();

    await expect(page.getByText("Parent Dashboard")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Early learner")).toBeVisible();
  });
});

test.describe("Onboarding calibration flow", () => {
  // These tests install the BackendSimulator BEFORE mount because the
  // onboarding page fires a session check (useParentSession) on initial render.
  // See CLAUDE.md: "Exception: when a component fires API calls during initial
  // render, install before mount."

  test("parent completes calibration with selected answers", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    // Install BEFORE mount — onboarding checks session on render
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

    await mount(<IwftApp initialPath="/parent/onboarding" />);

    // Step 1
    await expect(page.getByLabel("Child's name")).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Child's name").fill("Bella");
    await page.getByText("Confident reader").click();
    await page.getByLabel("4-digit PIN").fill("5678");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Calibration — answer all questions
    await expect(page.getByText("Sensitive topic calibration")).toBeVisible();
    await expect(page.getByText("Question 1 of")).toBeVisible();

    // Answer question 1 by clicking the first option
    await page.getByText("Babies grow inside their mummy").click();
    await page.getByRole("button", { name: "Next question" }).click();

    // Question 2
    await expect(page.getByText("Question 2 of")).toBeVisible();
    await page.getByText("When someone dies, their body stops working").click();
    await page.getByRole("button", { name: "Next question" }).click();

    // Question 3
    await expect(page.getByText("Question 3 of")).toBeVisible();
    await page
      .getByText("Swear words are words that many people find rude")
      .click();
    await page.getByRole("button", { name: "Next question" }).click();

    // Question 4 (last)
    await expect(page.getByText("Question 4 of")).toBeVisible();
    await page.getByText("Sometimes people hurt others because").click();
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3: Review — should show calibration count
    await expect(page.getByText("Review & confirm")).toBeVisible();
    await expect(page.getByText("4 of 4 questions answered")).toBeVisible();
    await page.getByRole("button", { name: "Create Bella's account" }).click();

    await expect(page.getByText("Bella's account is ready!")).toBeVisible();

    // Verify calibration answers were stored in the mock DB
    const child = backendSimulator.db.children.find(
      (c) => c.displayName === "Bella",
    );
    expect(child).toBeTruthy();
    const answers = backendSimulator.db.getCalibrationAnswers(child!.id);
    expect(answers).toHaveLength(4);
  });

  test("parent can skip calibration", async ({
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

    await mount(<IwftApp initialPath="/parent/onboarding" />);

    // Step 1
    await expect(page.getByLabel("Child's name")).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Child's name").fill("Charlie");
    await page.getByLabel("4-digit PIN").fill("9999");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Skip
    await expect(page.getByText("Sensitive topic calibration")).toBeVisible();
    await page.getByText("Skip calibration").click();

    // Step 3: Review shows skipped
    await expect(page.getByText("Review & confirm")).toBeVisible();
    await expect(page.getByText("Skipped — using defaults")).toBeVisible();
    await page
      .getByRole("button", { name: "Create Charlie's account" })
      .click();

    await expect(page.getByText("Charlie's account is ready!")).toBeVisible();

    // No calibration answers stored
    const child = backendSimulator.db.children.find(
      (c) => c.displayName === "Charlie",
    );
    expect(child).toBeTruthy();
    const answers = backendSimulator.db.getCalibrationAnswers(child!.id);
    expect(answers).toHaveLength(0);
  });

  test("review step shows slider customisation panel", async ({
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

    await mount(<IwftApp initialPath="/parent/onboarding" />);

    // Step 1
    await expect(page.getByLabel("Child's name")).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Child's name").fill("Dana");
    await page.getByText("Independent explorer").click();
    await page.getByLabel("4-digit PIN").fill("1111");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Skip
    await page.getByText("Skip calibration").click();

    // Step 3: Review — toggle sliders
    await expect(page.getByText("Review & confirm")).toBeVisible();
    await expect(page.getByText("Independent explorer")).toBeVisible();

    // Sliders hidden by default
    await expect(page.getByText("Vocabulary level")).not.toBeVisible();

    // Show sliders
    await page.getByText("Customise guardrail sliders").click();
    await expect(page.getByText("Vocabulary level")).toBeVisible();
    await expect(page.getByText("Response depth")).toBeVisible();
    await expect(page.getByText("Topic access")).toBeVisible();
  });

  test("edit links navigate back to correct step", async ({
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

    await mount(<IwftApp initialPath="/parent/onboarding" />);

    // Step 1
    await expect(page.getByLabel("Child's name")).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Child's name").fill("Eve");
    await page.getByLabel("4-digit PIN").fill("4321");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Skip
    await page.getByText("Skip calibration").click();

    // Step 3: Review — click Edit on calibration
    await expect(page.getByText("Review & confirm")).toBeVisible();

    // Find the Edit link for calibration — it's the last "Edit" link on the review page
    // (Name=first, Preset=second, PIN=third, Calibration=fourth)
    await page.getByText("Edit").nth(3).click();

    // Should be back on calibration step
    await expect(page.getByText("Sensitive topic calibration")).toBeVisible();
    await expect(page.getByText("Question 1 of")).toBeVisible();
  });
});
