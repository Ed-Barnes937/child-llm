import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";
import type { BackendSimulatorDb } from "../backend-simulator/BackendSimulatorDb.testHelper";

const seedAndLogin = async (
  db: BackendSimulatorDb,
  page: import("@playwright/test").Page,
  presetName:
    | "early-learner"
    | "confident-reader"
    | "independent-explorer" = "confident-reader",
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
    presetName,
    pin: "5678",
  });

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

test.describe("Chat round trip with persistence", () => {
  test("new conversation creates conversation, saves messages, and streams response", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    await page.getByPlaceholder("Type a message...").fill("What is the sun?");
    await page.getByRole("button", { name: "Send" }).click();

    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });
    await expect(aiMessage.locator("p")).toHaveText(
      "The sun is a big star that gives us light and warmth.",
    );

    // Wait for streaming to fully complete
    await expect(page.getByPlaceholder("Type a message...")).toBeEnabled();

    // Verify conversation was created in the mock DB
    const conversations = backendSimulator.db.getConversationsByChild(child.id);
    expect(conversations.length).toBe(1);
    expect(conversations[0].title).toBe("What is the sun?");

    // Verify messages were persisted
    const messages = backendSimulator.db.getMessagesByConversation(
      conversations[0].id,
    );
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe("child");
    expect(messages[0].content).toBe("What is the sun?");
    expect(messages[1].role).toBe("ai");
    expect(messages[1].content).toBe(
      "The sun is a big star that gives us light and warmth.",
    );
  });
});

test.describe("Report button", () => {
  test("report button creates a flag", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    await page.getByPlaceholder("Type a message...").fill("Tell me a joke");
    await page.getByRole("button", { name: "Send" }).click();

    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });

    const reportButton = page.getByTestId("report-button");
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    await expect(reportButton).toHaveText("Reported");
    await expect(reportButton).toBeDisabled();

    // Verify flag was created
    const flags = backendSimulator.db.flagsList.filter(
      (f) => f.childId === child.id && f.type === "reported",
    );
    expect(flags.length).toBe(1);
    expect(flags[0].reason).toBe("Child reported unsatisfactory answer");
  });
});

test.describe("Intent selection", () => {
  test("shows intent selection for early-learner preset", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page, "early-learner");

    // Install BEFORE mount — config is fetched on mount
    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/chat/new" />);

    // Early learner has interactionMode=1, should show intent selection
    await expect(page.getByTestId("intent-learn")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("intent-homework")).toBeVisible();
    await expect(page.getByTestId("intent-story")).toBeVisible();
    await expect(page.getByTestId("intent-explain")).toBeVisible();
    await expect(page.getByTestId("intent-quiz")).toBeVisible();

    // Click an intent
    await page.getByTestId("intent-learn").click();

    // Should switch to chat view with the prompt pre-filled
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
    await expect(page.getByPlaceholder("Type a message...")).toHaveValue(
      "Tell me about ",
    );
  });

  test("intent selection has an inspire me button", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page, "early-learner");

    // Install BEFORE mount — config is fetched on mount
    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/chat/new" />);

    await expect(page.getByTestId("intent-learn")).toBeVisible({
      timeout: 10000,
    });

    // Click inspire me from the intent selection screen
    await page.getByTestId("inspire-me").click();

    // Should send a message and show AI response
    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });
  });

  test("does not show intent selection for independent-explorer preset", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page, "independent-explorer");

    // Install BEFORE mount — config is fetched on mount
    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/chat/new" />);

    // Independent explorer has interactionMode=5, should go straight to chat
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("intent-learn")).not.toBeVisible();
  });
});

test.describe("Inspire me", () => {
  test("inspire me button in chat view sends a random topic", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page);

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();

    // Click inspire me
    await page.getByTestId("inspire-me").click();

    // Should see an AI response (the random topic was sent as a message)
    const aiMessage = page.getByTestId("ai-message");
    await expect(aiMessage).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Session limits", () => {
  test("shows warning near session limit and blocks at limit", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    // early-learner has sessionLimits=1 which maps to 10 messages
    // Warning at 80% = 8 messages
    await seedAndLogin(backendSimulator.db, page, "early-learner");

    // Install BEFORE mount — config is fetched on mount, and we need
    // intent selection to appear so we can dismiss it
    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/chat/new" />);

    // Skip intent selection
    await expect(page.getByTestId("intent-learn")).toBeVisible({
      timeout: 10000,
    });
    await page.getByText("Or just type your own question").click();

    // Session limit = 10, warning at 8
    // Each round trip = 2 messages (child + ai)
    // Need 4 round trips to reach 8 messages (warning), 5 to reach 10 (limit)

    for (let i = 0; i < 4; i++) {
      await page
        .getByPlaceholder("Type a message...")
        .fill(`Question ${i + 1}`);
      await page.getByRole("button", { name: "Send" }).click();
      await expect(page.getByTestId("ai-message").nth(i)).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByPlaceholder("Type a message...")).toBeEnabled();
    }

    // After 4 round trips = 8 messages, should show warning
    await expect(page.getByTestId("session-warning")).toBeVisible();

    // Send one more round trip to hit limit (9+10)
    await page.getByPlaceholder("Type a message...").fill("One more question");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByTestId("ai-message").nth(4)).toBeVisible({
      timeout: 10000,
    });

    // After hitting the limit, input stays disabled (transitions from
    // streaming-disabled to limit-disabled). Wait for the limit banner instead.
    await expect(page.getByTestId("session-limit")).toBeVisible({
      timeout: 10000,
    });

    // Input should be disabled
    await expect(page.getByPlaceholder("Type a message...")).toBeDisabled();
  });

  test("independent-explorer never shows session warning or limit", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    // independent-explorer has sessionLimits=4 which maps to 50 messages.
    // We don't want to send 50; instead, send a handful and confirm neither
    // banner appears and input stays enabled.
    await seedAndLogin(backendSimulator.db, page, "independent-explorer");

    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/chat/new" />);

    await expect(page.getByPlaceholder("Type a message...")).toBeVisible({
      timeout: 10000,
    });

    for (let i = 0; i < 3; i++) {
      await page
        .getByPlaceholder("Type a message...")
        .fill(`Question ${i + 1}`);
      await page.getByRole("button", { name: "Send" }).click();
      await expect(page.getByTestId("ai-message").nth(i)).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByPlaceholder("Type a message...")).toBeEnabled();
    }

    await expect(page.getByTestId("session-warning")).not.toBeVisible();
    await expect(page.getByTestId("session-limit")).not.toBeVisible();
  });

  test("continuation route respects session limits when existing messages exceed limit", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(
      backendSimulator.db,
      page,
      "early-learner",
    );

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "Old chat",
    });

    // Pre-seed 10 messages (= limit for early-learner)
    for (let i = 0; i < 5; i++) {
      backendSimulator.db.saveMessage({
        conversationId: convo.id,
        role: "child",
        content: `Q${i}`,
      });
      backendSimulator.db.saveMessage({
        conversationId: convo.id,
        role: "ai",
        content: `A${i}`,
      });
    }

    await backendSimulator.install(page);
    await mount(<IwftApp initialPath={`/child/chat/${convo.id}`} />);

    await expect(page.getByTestId("session-limit")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByPlaceholder("Type a message...")).toBeDisabled();
  });
});

test.describe("Pipeline flag persistence", () => {
  test("persists a flag event emitted during the chat stream", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    backendSimulator.db.setChatStreamScenario({
      tokens: ["When someone dies, their body stops working."],
      flag: {
        type: "sensitive",
        reason: "Sensitive topic detected: death-and-dying",
        topics: ["death-and-dying"],
        childMessage: "What happens when you die?",
        aiResponse: "When someone dies, their body stops working.",
      },
    });

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    await page
      .getByPlaceholder("Type a message...")
      .fill("What happens when you die?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByTestId("ai-message")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByPlaceholder("Type a message...")).toBeEnabled();

    const flags = backendSimulator.db.flagsList.filter(
      (f) => f.childId === child.id && f.type === "sensitive",
    );
    expect(flags.length).toBe(1);
    expect(flags[0].reason).toContain("death-and-dying");

    // The ai message should be persisted as flagged.
    const conversations = backendSimulator.db.getConversationsByChild(child.id);
    expect(conversations.length).toBe(1);
    const messages = backendSimulator.db.getMessagesByConversation(
      conversations[0].id,
    );
    const aiMessage = messages.find((m) => m.role === "ai");
    expect(aiMessage?.flagged).toBe(true);
  });
});

test.describe("Pipeline flag persistence: indirect sensitive probing", () => {
  test("flags are persisted when child uses innocuous follow-ups but AI introduces sensitive terms", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    // Turn 1: child asks an innocuous (misspelled) question, AI responds
    // with educational content that includes sensitive terms like "pregnancy"
    backendSimulator.db.setChatStreamScenario({
      tokens: [
        "A baby grows inside the mum's tummy during pregnancy. It takes about nine months!",
      ],
      flag: {
        type: "sensitive",
        reason: "Sensitive topic detected: reproduction",
        topics: ["reproduction"],
        childMessage: "How are babys made?",
        aiResponse:
          "A baby grows inside the mum's tummy during pregnancy. It takes about nine months!",
      },
    });

    await mount(<IwftApp initialPath="/child/chat/new" />);
    await backendSimulator.install(page);

    await page
      .getByPlaceholder("Type a message...")
      .fill("How are babys made?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByTestId("ai-message")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByPlaceholder("Type a message...")).toBeEnabled();

    // Turn 2: child follows up with generic phrasing, pipeline flags again
    // because its own prior response contained sensitive terms
    backendSimulator.db.setChatStreamScenario({
      tokens: [
        "The sperm travels through the mum's body during a process called conception.",
      ],
      flag: {
        type: "sensitive",
        reason: "Sensitive topic detected: reproduction",
        topics: ["reproduction"],
        childMessage: "How does the sperm get to the egg?",
        aiResponse:
          "The sperm travels through the mum's body during a process called conception.",
      },
    });

    await page
      .getByPlaceholder("Type a message...")
      .fill("How does the sperm get to the egg?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByTestId("ai-message")).toHaveCount(2, {
      timeout: 10000,
    });
    await expect(page.getByPlaceholder("Type a message...")).toBeEnabled();

    // Both turns should have created flags
    const flags = backendSimulator.db.flagsList.filter(
      (f) => f.childId === child.id && f.type === "sensitive",
    );
    expect(flags.length).toBe(2);
    expect(flags.every((f) => f.reason.includes("reproduction"))).toBe(true);

    // Both AI messages should be persisted as flagged
    const conversations = backendSimulator.db.getConversationsByChild(child.id);
    const messages = backendSimulator.db.getMessagesByConversation(
      conversations[0].id,
    );
    const aiMessages = messages.filter((m) => m.role === "ai");
    expect(aiMessages.length).toBe(2);
    expect(aiMessages.every((m) => m.flagged)).toBe(true);

    // Flags include conversation references so the parent flags page can
    // link through to the conversation detail (tested in parent-integration)
    expect(flags[0].conversationId).toBe(conversations[0].id);
    expect(flags[1].conversationId).toBe(conversations[0].id);
  });
});

test.describe("Home page conversations list", () => {
  test("shows previous conversations on home page", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    // Seed some conversations
    backendSimulator.db.createConversation({
      childId: child.id,
      title: "About dinosaurs",
    });
    backendSimulator.db.createConversation({
      childId: child.id,
      title: "How do planes fly?",
    });

    // Install BEFORE mount — conversations are fetched on mount
    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/home" />);

    // Should show the conversations
    await expect(page.getByText("Previous conversations")).toBeVisible({
      timeout: 10000,
    });
    const items = page.getByTestId("conversation-item");
    await expect(items).toHaveCount(2);
    await expect(page.getByText("About dinosaurs")).toBeVisible();
    await expect(page.getByText("How do planes fly?")).toBeVisible();
  });

  test("shows empty state when no conversations exist", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await seedAndLogin(backendSimulator.db, page);

    // Install BEFORE mount — conversations are fetched on mount
    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/home" />);

    await expect(
      page.getByText("What would you like to talk about?"),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Previous conversations")).not.toBeVisible();
  });
});

test.describe("Conversation continuation", () => {
  test("loads existing messages when opening a previous conversation", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    // Create a conversation with messages
    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "About space",
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "What are stars?",
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "ai",
      content: "Stars are giant balls of hot gas that shine in the night sky.",
    });

    // Install BEFORE mount — messages and config are fetched on mount
    await backendSimulator.install(page);
    await mount(<IwftApp initialPath={`/child/chat/${convo.id}`} />);

    // Should show the existing messages
    await expect(page.getByText("What are stars?")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(
        "Stars are giant balls of hot gas that shine in the night sky.",
      ),
    ).toBeVisible();

    // Should be able to send a new message in the same conversation
    await page
      .getByPlaceholder("Type a message...")
      .fill("How far away are they?");
    await page.getByRole("button", { name: "Send" }).click();

    // Should see new AI response
    await expect(page.getByTestId("ai-message").nth(1)).toBeVisible({
      timeout: 10000,
    });

    // Wait for streaming to fully complete before checking DB
    await expect(page.getByPlaceholder("Type a message...")).toBeEnabled();

    // Verify message was saved to the same conversation
    const messages = backendSimulator.db.getMessagesByConversation(convo.id);
    expect(messages.length).toBe(4);
    expect(messages[2].content).toBe("How far away are they?");
  });
});
