import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";
import type { BackendSimulatorDb } from "../backend-simulator/BackendSimulatorDb.testHelper";

const seedAndLogin = async (
  db: BackendSimulatorDb,
  page: import("@playwright/test").Page,
) => {
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

  // Set child session in localStorage
  await page.evaluate(
    (session) => {
      localStorage.setItem(
        "child-safe-llm-child-session",
        JSON.stringify(session),
      );
    },
    {
      id: child.id,
      displayName: child.displayName,
      username: child.username,
      presetName: child.presetName,
      parentId: child.parentId,
    },
  );

  return { parent, child };
};

test.describe("Pipeline guardrails", () => {
  test("validation-failed flag shows a safe fallback response", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page);

    // Configure mock to simulate a validation failure
    backendSimulator.db.setChatStreamScenario({
      tokens: [
        "Hmm, I'm not sure I can give you a good answer to that right now. ",
        "Try asking your parent — they might be able to help!",
      ],
      flag: {
        type: "validation-failed",
        reason: "Response contained age-inappropriate content",
        childMessage: "Tell me about something bad",
      },
    });

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    // Send a message
    await page
      .getByPlaceholder("Type a message...")
      .fill("Tell me about something bad");
    await page.getByRole("button", { name: "Send" }).click();

    // Should receive the safe fallback response
    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });
    await expect(aiMessage.locator("p")).toContainText(
      "Try asking your parent",
    );
  });

  test("blocked flag shows a safe fallback response", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page);

    // Configure mock to simulate a blocklist hit
    backendSimulator.db.setChatStreamScenario({
      tokens: [
        "I'm not able to help with that one. ",
        "Try asking your parent or a trusted adult instead.",
      ],
      flag: {
        type: "blocked",
        reason: "Output blocklist triggered: profanity",
        childMessage: "Teach me bad words",
      },
    });

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    await page.getByPlaceholder("Type a message...").fill("Teach me bad words");
    await page.getByRole("button", { name: "Send" }).click();

    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });
    await expect(aiMessage.locator("p")).toContainText("not able to help");
  });

  test("sensitive topic flag still shows the AI response", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page);

    // Sensitive topics get flagged but the response IS shown
    backendSimulator.db.setChatStreamScenario({
      tokens: [
        "When someone dies, their body stops working. ",
        "Different families have different beliefs about what happens next.",
      ],
      flag: {
        type: "sensitive",
        reason: "Sensitive topic detected: death-and-dying",
        topics: ["death-and-dying"],
        childMessage: "What happens when you die?",
        aiResponse:
          "When someone dies, their body stops working. Different families have different beliefs about what happens next.",
      },
    });

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    await page
      .getByPlaceholder("Type a message...")
      .fill("What happens when you die?");
    await page.getByRole("button", { name: "Send" }).click();

    // Should still show the response (sensitive topics are flagged, not blocked)
    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });
    await expect(aiMessage.locator("p")).toContainText("body stops working");
  });

  test("normal response works without flags", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page);
    // No scenario set — uses default "The sun is a big star..." response

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    await page.getByPlaceholder("Type a message...").fill("What is the sun?");
    await page.getByRole("button", { name: "Send" }).click();

    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });
    await expect(aiMessage.locator("p")).toHaveText(
      "The sun is a big star that gives us light and warmth.",
    );
  });
});
