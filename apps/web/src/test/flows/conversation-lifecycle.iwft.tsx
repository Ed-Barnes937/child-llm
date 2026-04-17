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

test.describe("Conversation summary view", () => {
  test("shows summary when conversation has been purged", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    // Create a conversation that has a summary but no messages (purged)
    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "About volcanoes",
      summary:
        "Alex asked about how volcanoes work. The AI explained tectonic plates, magma chambers, and eruption types in age-appropriate language.",
    });

    await backendSimulator.install(page);
    await mount(<IwftApp initialPath={`/child/chat/${convo.id}`} />);

    // Should show the summary view
    await expect(page.getByTestId("conversation-summary")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("Alex asked about how volcanoes work"),
    ).toBeVisible();
    await expect(
      page.getByText("The full conversation has been summarised"),
    ).toBeVisible();

    // Should show delete button
    await expect(page.getByTestId("delete-conversation")).toBeVisible();

    // Should NOT show the chat input
    await expect(page.getByPlaceholder("Type a message...")).not.toBeVisible();
  });

  test("delete button removes the conversation and navigates home", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "Old conversation",
      summary: "A conversation about dinosaurs.",
    });

    await backendSimulator.install(page);
    await mount(<IwftApp initialPath={`/child/chat/${convo.id}`} />);

    await expect(page.getByTestId("conversation-summary")).toBeVisible({
      timeout: 10000,
    });

    // Click delete
    await page.getByTestId("delete-conversation").click();

    // Should navigate to home
    await expect(page.getByText("Hi, Alex!")).toBeVisible({ timeout: 10000 });

    // Conversation should be removed from the mock DB
    const conversations = backendSimulator.db.getConversationsByChild(child.id);
    expect(conversations.length).toBe(0);
  });

  test("shows normal chat when conversation has messages (not purged)", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "Active conversation",
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "Hello!",
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "ai",
      content: "Hi there! How can I help?",
    });

    await backendSimulator.install(page);
    await mount(<IwftApp initialPath={`/child/chat/${convo.id}`} />);

    // Should show chat messages, not summary
    await expect(page.getByText("Hello!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Hi there! How can I help?")).toBeVisible();
    await expect(page.getByTestId("conversation-summary")).not.toBeVisible();
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
  });
});

test.describe("Summarise and purge", () => {
  test("summarise and purge generates summary and removes messages", async ({
    backendSimulator,
  }) => {
    const parent = backendSimulator.db.createParent({
      name: "Test Parent",
      email: "parent@test.com",
      password: "testpassword123",
    });

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alex",
      presetName: "confident-reader",
      pin: "5678",
    });

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
      content: "Stars are giant balls of hot gas.",
    });

    // Verify messages exist
    expect(backendSimulator.db.getMessagesByConversation(convo.id).length).toBe(
      2,
    );

    // Summarise and purge
    const summary = backendSimulator.db.summariseAndPurge(convo.id);

    // Should have generated a summary
    expect(summary).toContain("About space");

    // Messages should be deleted
    expect(backendSimulator.db.getMessagesByConversation(convo.id).length).toBe(
      0,
    );

    // Summary should be stored on conversation
    expect(backendSimulator.db.getConversationSummary(convo.id)).toBe(summary);
  });
});

test.describe("Home page with summarised conversations", () => {
  test("summarised conversations appear in the conversations list", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    const { child } = await seedAndLogin(backendSimulator.db, page);

    // One active, one summarised
    backendSimulator.db.createConversation({
      childId: child.id,
      title: "Active chat",
    });
    backendSimulator.db.createConversation({
      childId: child.id,
      title: "Old chat",
      summary: "A conversation about the ocean.",
    });

    await backendSimulator.install(page);
    await mount(<IwftApp initialPath="/child/home" />);

    await expect(page.getByText("Previous conversations")).toBeVisible({
      timeout: 10000,
    });
    const items = page.getByTestId("conversation-item");
    await expect(items).toHaveCount(2);
    await expect(page.getByText("Active chat")).toBeVisible();
    await expect(page.getByText("Old chat")).toBeVisible();
  });
});
