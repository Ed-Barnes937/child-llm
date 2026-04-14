import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";
import type { BackendSimulatorDb } from "../backend-simulator/BackendSimulatorDb.testHelper";

const seedParentAndChild = (db: BackendSimulatorDb) => {
  const parent = db.createParent({
    name: "Test Parent",
    email: "parent@test.com",
    password: "testpassword123",
  });
  db.createSession(parent.id);

  const child = db.createChild({
    parentId: parent.id,
    displayName: "Alex",
    presetName: "confident-reader",
    pin: "5678",
  });

  return { parent, child };
};

test.describe("Child login", () => {
  test("child can log in with username + password on new device", async ({ mount, page, backendSimulator }) => {
    // Clear localStorage before mount to simulate a brand new device
    await page.evaluate(() => localStorage.clear());

    const component = await mount(<IwftApp initialPath="/child/login" />);
    await backendSimulator.install(page);

    const { child } = seedParentAndChild(backendSimulator.db);

    // New device = no device token = shows username/password form
    await expect(component.getByLabel("Username")).toBeVisible();
    await component.getByLabel("Username").fill(child.username);
    await component.getByLabel("Password").fill(child.username);
    await component.getByRole("button", { name: "Log in" }).click();

    // Should navigate to child home
    await expect(page.getByText("Hi, Alex!")).toBeVisible({ timeout: 10000 });
  });

  test("child can log in with PIN on known device", async ({ mount, page, backendSimulator }) => {
    // Seed data first (before mount, so we know the child details)
    const { parent, child } = seedParentAndChild(backendSimulator.db);

    // Set up device token in localStorage BEFORE mount
    const deviceToken = "test-device-token-123";
    await page.evaluate((token) => {
      localStorage.setItem("child-safe-llm-device-token", token);
    }, deviceToken);
    backendSimulator.db.registerDevice(parent.id, deviceToken);

    // Install routes BEFORE mount — the component reads the device token
    // on mount and immediately fetches device-children
    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/login" />);

    // Known device should show profile selector
    await expect(page.getByText("Alex")).toBeVisible({ timeout: 10000 });

    // Click the child's name
    await page.getByText("Alex").click();

    // Should show PIN entry
    await expect(page.getByText("Hi, Alex!")).toBeVisible();
    await page.getByPlaceholder("****").fill("5678");
    await page.getByRole("button", { name: "Go" }).click();

    // Should navigate to child home
    await expect(page.getByText("Hi, Alex!")).toBeVisible();
    await expect(page.getByText("Start a new conversation")).toBeVisible();
  });
});

test.describe("Chat", () => {
  test("child can send a message and receive a streamed response", async ({ mount, page, backendSimulator }) => {
    // Seed data
    const { child } = seedParentAndChild(backendSimulator.db);

    // Set child session in localStorage BEFORE mount
    await page.evaluate((session) => {
      localStorage.setItem("child-safe-llm-child-session", JSON.stringify(session));
    }, {
      id: child.id,
      displayName: child.displayName,
      username: child.username,
      presetName: child.presetName,
      parentId: child.parentId,
    });

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    // Should see the empty chat state
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();

    // Send a message
    await page.getByPlaceholder("Type a message...").fill("What is the sun?");
    await page.getByRole("button", { name: "Send" }).click();

    // Should see child's message
    await expect(page.getByText("What is the sun?")).toBeVisible();

    // Should receive the mocked streamed response
    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });

    // The BackendSimulator returns: "The sun is a big star that gives us light and warmth."
    await expect(aiMessage.locator("p")).toHaveText(
      "The sun is a big star that gives us light and warmth.",
    );
  });
});
