import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";
import type { BackendSimulator } from "../backend-simulator/BackendSimulator.testHelper";

const seedParentWithSession = async (
  backendSimulator: BackendSimulator,
  page: import("@playwright/test").Page,
) => {
  const parent = backendSimulator.db.createParent({
    name: "Alice",
    email: "alice@test.com",
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
  return parent;
};

test.describe("Cross-page integration: flag review flow", () => {
  test("navigate from flags list → conversation detail → back to flags", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);
    const parent = await seedParentWithSession(backendSimulator, page);

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Ben",
      presetName: "early-learner",
      pin: "1234",
    });

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "Space chat",
    });

    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "What are planets?",
    });
    const flaggedMsg = backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "ai",
      content: "Planets orbit stars in space.",
      flagged: true,
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "Cool!",
    });

    backendSimulator.db.createFlag({
      childId: child.id,
      conversationId: convo.id,
      messageId: flaggedMsg.id,
      type: "sensitive",
      reason: "Sensitive topic detected",
      topics: ["space"],
    });

    await mount(<IwftApp initialPath="/parent/flags" />);

    // Flags page loaded
    await expect(
      page.getByRole("heading", { name: "Flagged Conversations" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("flag-item")).toHaveCount(1);

    // Click the flag link to navigate to conversation detail
    await page.getByTestId("flag-link").click();

    // Conversation detail loaded — should show all 3 messages
    await expect(page.getByTestId("transcript-message")).toHaveCount(3, {
      timeout: 10000,
    });

    // Flagged message is highlighted
    const flagged = page.locator('[data-flagged="true"]');
    await expect(flagged).toHaveCount(1);
    await expect(flagged.first()).toContainText(
      "Planets orbit stars in space.",
    );

    // Navigate back to flags page
    await page.getByTestId("back-button").click();

    // Flags page is back
    await expect(
      page.getByRole("heading", { name: "Flagged Conversations" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("flag-item")).toHaveCount(1);
  });
});

test.describe("Cross-page integration: flag reviewed updates dashboard", () => {
  test("marking a flag reviewed on flags page reduces dashboard flag count", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);
    const parent = await seedParentWithSession(backendSimulator, page);

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Ben",
      presetName: "early-learner",
      pin: "1234",
    });

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "Space chat",
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "Hello",
    });

    backendSimulator.db.createFlag({
      childId: child.id,
      conversationId: convo.id,
      type: "sensitive",
      reason: "Flag one",
    });
    backendSimulator.db.createFlag({
      childId: child.id,
      conversationId: convo.id,
      type: "blocked",
      reason: "Flag two",
    });

    // Start on flags page
    await mount(<IwftApp initialPath="/parent/flags" />);

    await expect(page.getByTestId("flag-item")).toHaveCount(2, {
      timeout: 10000,
    });

    // Mark the first flag as reviewed
    const reviewButtons = page.getByTestId("mark-reviewed-button");
    await reviewButtons.first().click();

    // Wait for reviewed state
    await expect(
      page
        .getByTestId("mark-reviewed-button")
        .first()
        .filter({ hasText: "Reviewed" }),
    ).toBeVisible({ timeout: 10000 });

    // Navigate to dashboard via "Back to dashboard" link
    await page.getByText("Back to dashboard").click();

    // Dashboard should load and show 1 unreviewed flag (not 2)
    await expect(
      page.getByRole("heading", { name: "Parent Dashboard" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 unreviewed flag")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Cross-page integration: child settings", () => {
  test("changing preset in child settings reflects in children list", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);
    const parent = await seedParentWithSession(backendSimulator, page);

    backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alice",
      presetName: "early-learner",
      pin: "1234",
    });

    // Start on children list
    await mount(<IwftApp initialPath="/parent/children" />);

    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Early learner")).toBeVisible();

    // Navigate to child settings
    await page.getByText("Alice").click();

    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });

    // Change preset to Independent explorer
    await page.getByText("Independent explorer").click();
    await expect(page.getByText("Preset saved")).toBeVisible({ timeout: 5000 });

    // Navigate back to children list
    await page.getByText("Back to children").click();

    // Children list should now show the updated preset label
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Independent explorer")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Early learner")).not.toBeVisible();
  });

  test("slider changes persist after navigating away and back", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);
    const parent = await seedParentWithSession(backendSimulator, page);

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alice",
      presetName: "early-learner",
      pin: "1234",
    });

    // Start on children list, navigate to child settings
    await mount(<IwftApp initialPath="/parent/children" />);

    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });
    await page.getByText("Alice").click();

    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });

    // Early-learner default: vocabularyLevel = 1 → shows "1 / 5"
    await expect(page.getByText("Vocabulary level")).toBeVisible();
    const vocabSlider = page.getByRole("slider", { name: "Vocabulary level" });
    await expect(vocabSlider).toHaveAttribute("aria-valuenow", "1");

    // Increase vocabulary level via keyboard (ArrowRight increments by step=1)
    await vocabSlider.focus();
    await vocabSlider.press("ArrowRight");
    await vocabSlider.press("ArrowRight");

    // Should now be 3
    await expect(vocabSlider).toHaveAttribute("aria-valuenow", "3");

    // Verify the mock DB was updated
    const config = backendSimulator.db.getChildConfig(child.id);
    expect(config.sliders.vocabularyLevel).toBe(3);

    // Navigate back to children list
    await page.getByText("Back to children").click();
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });

    // Navigate back to child settings
    await page.getByText("Alice").click();
    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });

    // Slider should still show 3 (loaded from persisted config)
    const vocabSliderAfterNav = page.getByRole("slider", {
      name: "Vocabulary level",
    });
    await expect(vocabSliderAfterNav).toHaveAttribute("aria-valuenow", "3", {
      timeout: 10000,
    });
  });

  test("inspire me topics persist after navigating away and back", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);
    const parent = await seedParentWithSession(backendSimulator, page);

    backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Alice",
      presetName: "early-learner",
      pin: "1234",
    });

    // Start on children list
    await mount(<IwftApp initialPath="/parent/children" />);

    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });
    await page.getByText("Alice").click();

    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });

    // Add a topic
    await page.getByLabel("New topic").fill("Dinosaurs");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Dinosaurs")).toBeVisible({ timeout: 5000 });

    // Add a second topic
    await page.getByLabel("New topic").fill("Volcanoes");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Volcanoes")).toBeVisible({ timeout: 5000 });

    // Navigate back to children list
    await page.getByText("Back to children").click();
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });

    // Navigate back to child settings
    await page.getByText("Alice").click();
    await expect(page.getByText("Alice's Settings")).toBeVisible({
      timeout: 10000,
    });

    // Topics should still be visible
    await expect(page.getByText("Dinosaurs")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Volcanoes")).toBeVisible();
  });
});

test.describe("Cross-page integration: dashboard to child settings", () => {
  test("dashboard tab stats match then navigate to child settings and back", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);
    const parent = await seedParentWithSession(backendSimulator, page);

    const child1 = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Ben",
      presetName: "early-learner",
      pin: "1234",
    });

    const child2 = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Clara",
      presetName: "confident-reader",
      pin: "5678",
    });

    // Ben has 2 conversations + 1 flag
    const conv1 = backendSimulator.db.createConversation({
      childId: child1.id,
      title: "Chat 1",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv1.id,
      role: "child",
      content: "Hello",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv1.id,
      role: "ai",
      content: "Hi there!",
    });

    const conv2 = backendSimulator.db.createConversation({
      childId: child1.id,
      title: "Chat 2",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv2.id,
      role: "child",
      content: "What is rain?",
    });

    backendSimulator.db.createFlag({
      childId: child1.id,
      conversationId: conv1.id,
      type: "sensitive",
      reason: "Sensitive topic",
      topics: ["weather"],
    });

    // Clara has 1 conversation, no flags
    const conv3 = backendSimulator.db.createConversation({
      childId: child2.id,
      title: "Chat 3",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv3.id,
      role: "child",
      content: "Tell me about dogs",
    });

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    // Ben's tab should be selected by default
    await expect(
      page.getByRole("tab", { name: "Ben", selected: true }),
    ).toBeVisible({ timeout: 10000 });

    // Ben's stats: 3 messages, 2 conversations, 1 flag
    await expect(page.getByText("3 messages")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("2 conversations")).toBeVisible();
    await expect(page.getByText("1 unreviewed flag")).toBeVisible();
    await expect(page.getByText("weather")).toBeVisible();

    // Switch to Clara's tab
    await page.getByRole("tab", { name: "Clara" }).click();

    // Clara's stats: 1 message, 1 conversation, no flags
    await expect(page.getByText("1 message")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 conversation")).toBeVisible();

    // No flag count shown for Clara (0 flags → no "Review flags" button)
    await expect(page.getByText("Review flags")).not.toBeVisible();
  });
});
