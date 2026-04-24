import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";

test.describe("Flagged Conversations Screen", () => {
  test("flags page shows all flags for parent", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    // Install BEFORE mount — flags page checks session on render
    await backendSimulator.install(page);

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

    const child1 = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Tommy",
      presetName: "early-learner",
      pin: "1234",
    });
    const child2 = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Sara",
      presetName: "confident-reader",
      pin: "5678",
    });

    const convo1 = backendSimulator.db.createConversation({
      childId: child1.id,
      title: "About space",
    });
    const convo2 = backendSimulator.db.createConversation({
      childId: child2.id,
      title: "About animals",
    });

    backendSimulator.db.createFlag({
      childId: child1.id,
      conversationId: convo1.id,
      type: "sensitive",
      reason: "Sensitive topic detected",
      topics: ["death"],
    });
    backendSimulator.db.createFlag({
      childId: child1.id,
      conversationId: convo1.id,
      type: "blocked",
      reason: "Blocked content found",
    });
    backendSimulator.db.createFlag({
      childId: child2.id,
      conversationId: convo2.id,
      type: "validation-failed",
      reason: "Validation model flagged response",
    });

    await mount(<IwftApp initialPath="/parent/flags" />);

    // Should show all 3 flags
    await expect(page.getByTestId("flag-item")).toHaveCount(3, {
      timeout: 10000,
    });

    // Check flag types are displayed
    await expect(page.getByText("Sensitive topic detected")).toBeVisible();
    await expect(page.getByText("Blocked content found")).toBeVisible();
    await expect(
      page.getByText("Validation model flagged response"),
    ).toBeVisible();

    // Check type badges exist
    const badges = page.getByTestId("flag-type-badge");
    await expect(badges).toHaveCount(3);
    await expect(badges.filter({ hasText: "Sensitive" })).toHaveCount(1);
    await expect(badges.filter({ hasText: "Blocked" })).toHaveCount(1);
    await expect(badges.filter({ hasText: "Validation Failed" })).toHaveCount(
      1,
    );

    // Check child names appear in the flag cards
    const flagItems = page.getByTestId("flag-item");
    await expect(flagItems.filter({ hasText: "Tommy" })).toHaveCount(2);
    await expect(flagItems.filter({ hasText: "Sara" })).toHaveCount(1);

    // Check topics
    await expect(page.getByTestId("flag-topic")).toHaveCount(1);
    await expect(page.getByText("death")).toBeVisible();
  });

  test("filtering by child shows only that child's flags", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

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

    const child1 = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Tommy",
      presetName: "early-learner",
      pin: "1234",
    });
    const child2 = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Sara",
      presetName: "confident-reader",
      pin: "5678",
    });

    const convo1 = backendSimulator.db.createConversation({
      childId: child1.id,
      title: "About space",
    });
    const convo2 = backendSimulator.db.createConversation({
      childId: child2.id,
      title: "About animals",
    });

    backendSimulator.db.createFlag({
      childId: child1.id,
      conversationId: convo1.id,
      type: "sensitive",
      reason: "Sensitive topic detected",
    });
    backendSimulator.db.createFlag({
      childId: child2.id,
      conversationId: convo2.id,
      type: "blocked",
      reason: "Blocked content found",
    });

    await mount(<IwftApp initialPath="/parent/flags" />);

    // Initially shows all flags
    await expect(page.getByTestId("flag-item")).toHaveCount(2, {
      timeout: 10000,
    });

    // Filter to Tommy only
    await page.getByTestId("child-filter").selectOption({ label: "Tommy" });

    // Should now show only Tommy's flag
    await expect(page.getByTestId("flag-item")).toHaveCount(1, {
      timeout: 10000,
    });
    await expect(page.getByText("Sensitive topic detected")).toBeVisible();
    await expect(page.getByText("Blocked content found")).not.toBeVisible();
  });

  test("mark as reviewed updates the flag and shows reviewed state", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

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

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Tommy",
      presetName: "early-learner",
      pin: "1234",
    });

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "About space",
    });

    backendSimulator.db.createFlag({
      childId: child.id,
      conversationId: convo.id,
      type: "sensitive",
      reason: "Sensitive topic detected",
    });

    await mount(<IwftApp initialPath="/parent/flags" />);

    await expect(page.getByTestId("flag-item")).toHaveCount(1, {
      timeout: 10000,
    });

    // The button should say "Mark as reviewed" and be enabled
    const reviewButton = page.getByTestId("mark-reviewed-button");
    await expect(reviewButton).toBeVisible();
    await expect(reviewButton).toHaveText("Mark as reviewed");
    await expect(reviewButton).toBeEnabled();

    // Click mark as reviewed
    await reviewButton.click();

    // After the mutation and refetch, the button should show reviewed state
    await expect(
      page.getByTestId("mark-reviewed-button").filter({ hasText: "Reviewed" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mark-reviewed-button")).toBeDisabled();
  });

  test("empty state shown when no flags exist", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

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

    await mount(<IwftApp initialPath="/parent/flags" />);

    await expect(page.getByTestId("empty-state")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("No flagged conversations found."),
    ).toBeVisible();
  });
});

test.describe("Conversation Detail Screen", () => {
  test("conversation detail shows messages in order", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

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

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Tommy",
      presetName: "early-learner",
      pin: "1234",
    });

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "About space",
    });

    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "What is the sun?",
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "ai",
      content: "The sun is a star that gives us light and warmth.",
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "Is it very hot?",
    });

    // Create a flag so the title resolver can find the child name
    backendSimulator.db.createFlag({
      childId: child.id,
      conversationId: convo.id,
      type: "sensitive",
      reason: "Sensitive topic detected",
    });

    await mount(<IwftApp initialPath={`/parent/conversations/${convo.id}`} />);

    // Should show all 3 messages
    await expect(page.getByTestId("transcript-message")).toHaveCount(3, {
      timeout: 10000,
    });

    // Check messages appear in order
    const messageTexts = await page
      .getByTestId("transcript-message")
      .allTextContents();

    expect(messageTexts[0]).toContain("What is the sun?");
    expect(messageTexts[1]).toContain(
      "The sun is a star that gives us light and warmth.",
    );
    expect(messageTexts[2]).toContain("Is it very hot?");
  });

  test("flagged messages have data-flagged attribute", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

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

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Tommy",
      presetName: "early-learner",
      pin: "1234",
    });

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "About space",
    });

    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "What is the sun?",
    });
    const flaggedMsg = backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "ai",
      content: "The sun is dangerous to look at.",
      flagged: true,
    });
    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "Ok thanks",
    });

    // Create a flag referencing the flagged message
    backendSimulator.db.createFlag({
      childId: child.id,
      conversationId: convo.id,
      messageId: flaggedMsg.id,
      type: "sensitive",
      reason: "Sensitive topic detected",
    });

    await mount(<IwftApp initialPath={`/parent/conversations/${convo.id}`} />);

    await expect(page.getByTestId("transcript-message")).toHaveCount(3, {
      timeout: 10000,
    });

    // Only the flagged message should have data-flagged="true"
    const flaggedElements = page.locator('[data-flagged="true"]');
    await expect(flaggedElements).toHaveCount(1);

    // The flagged message should contain the flagged content
    await expect(flaggedElements.first()).toContainText(
      "The sun is dangerous to look at.",
    );
  });

  test("back button navigates to flags page", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

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

    const child = backendSimulator.db.createChild({
      parentId: parent.id,
      displayName: "Tommy",
      presetName: "early-learner",
      pin: "1234",
    });

    const convo = backendSimulator.db.createConversation({
      childId: child.id,
      title: "About space",
    });

    backendSimulator.db.saveMessage({
      conversationId: convo.id,
      role: "child",
      content: "Hello",
    });

    await mount(<IwftApp initialPath={`/parent/conversations/${convo.id}`} />);

    await expect(page.getByTestId("back-button")).toBeVisible({
      timeout: 10000,
    });

    // Click the back button
    await page.getByTestId("back-button").click();

    // Should navigate to the flags page
    await expect(
      page.getByRole("heading", { name: "Flagged Conversations" }),
    ).toBeVisible({
      timeout: 10000,
    });
  });
});
