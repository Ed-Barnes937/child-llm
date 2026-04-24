import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";

test.describe("Children list", () => {
  test("shows all children for the parent", async ({
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

    backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alice",
      presetName: "early-learner",
      pin: "1234",
    });
    backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Bob",
      presetName: "confident-reader",
      pin: "5678",
    });

    await mount(<IwftApp initialPath="/parent/children" />);

    await expect(page.getByText("Children")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Early learner")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();
    await expect(page.getByText("Confident reader")).toBeVisible();
  });

  test("clicking a child navigates to child settings", async ({
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

    backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alice",
      presetName: "early-learner",
      pin: "1234",
    });

    await mount(<IwftApp initialPath="/parent/children" />);

    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });
    await page.getByText("Alice").click();

    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Child settings", () => {
  test("Inspire Me topics CRUD - add, see, delete", async ({
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

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alice",
      presetName: "early-learner",
      pin: "1234",
    });

    await mount(<IwftApp initialPath={`/parent/children/${child.id}`} />);

    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });

    // Initially no topics
    await expect(
      page.getByText("No topics yet. Add some to inspire conversations."),
    ).toBeVisible();

    // Add a topic
    await page.getByLabel("New topic").fill("Dinosaurs");
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText("Dinosaurs")).toBeVisible({ timeout: 5000 });

    // Add another topic
    await page.getByLabel("New topic").fill("Space");
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText("Space")).toBeVisible({ timeout: 5000 });

    // Delete the first topic
    await page.getByLabel("Delete topic Dinosaurs").click();

    await expect(page.getByText("Dinosaurs")).not.toBeVisible({
      timeout: 5000,
    });
    // Space should still be there
    await expect(page.getByText("Space")).toBeVisible();
  });

  test("changing preset updates the child's preset name", async ({
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

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alice",
      presetName: "early-learner",
      pin: "1234",
    });

    await mount(<IwftApp initialPath={`/parent/children/${child.id}`} />);

    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });

    // Early learner should be the current preset (highlighted)
    // Now click Independent explorer
    await page.getByText("Independent explorer").click();

    // Should show confirmation
    await expect(page.getByText("Preset saved")).toBeVisible({ timeout: 5000 });

    // Verify the mock DB was updated
    const updatedChild = backendSimulator.db.findChildById(child.id);
    expect(updatedChild?.presetName).toBe("independent-explorer");
  });

  test("PIN reset flow works", async ({ mount, page, backendSimulator }) => {
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

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alice",
      presetName: "early-learner",
      pin: "1234",
    });

    await mount(<IwftApp initialPath={`/parent/children/${child.id}`} />);

    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });

    // Click Reset PIN
    await page.getByRole("button", { name: "Reset PIN" }).click();

    // Should show PIN input
    await expect(page.getByLabel("New PIN")).toBeVisible();

    // Enter new PIN
    await page.getByLabel("New PIN").fill("9999");
    await page.getByRole("button", { name: "Confirm" }).click();

    // Should show success
    await expect(page.getByText("PIN updated")).toBeVisible({ timeout: 5000 });

    // Verify the mock DB was updated
    const updatedChild = backendSimulator.db.findChildById(child.id);
    expect(updatedChild?.pinHash).toBe("9999");
  });
});
