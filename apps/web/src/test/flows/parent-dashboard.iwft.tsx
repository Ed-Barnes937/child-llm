import { test, expect } from "../fixtures.testHelper";
import IwftApp from "../IwftApp";
import type { BackendSimulator } from "../backend-simulator/BackendSimulator.testHelper";
import { EndpointKey } from "../backend-simulator/Endpoint.testHelper";

test.describe("Parent dashboard with tab bar and summary panel", () => {
  // Dashboard checks session on render, so install BackendSimulator BEFORE mount
  // and set up parent + session + cookie before mounting.

  const seedDashboard = (backendSimulator: BackendSimulator) => {
    const parent = backendSimulator.db.createParent({
      name: "Alice",
      email: "alice@test.com",
      password: "pass",
    });
    const session = backendSimulator.db.createSession(parent.id);

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

    // Conversations + messages for Ben
    const conv1 = backendSimulator.db.createConversation({
      childId: child1.id,
      title: "Space chat",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv1.id,
      role: "child",
      content: "Tell me about stars",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv1.id,
      role: "ai",
      content: "Stars are big balls of gas!",
    });

    const conv2 = backendSimulator.db.createConversation({
      childId: child1.id,
      title: "Animal chat",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv2.id,
      role: "child",
      content: "What is a dog?",
    });

    // Flags for Ben (unreviewed)
    backendSimulator.db.createFlag({
      childId: child1.id,
      conversationId: conv1.id,
      type: "sensitive",
      reason: "Sensitive topic detected",
      topics: ["space", "science"],
    });
    backendSimulator.db.createFlag({
      childId: child1.id,
      conversationId: conv2.id,
      type: "blocked",
      reason: "Content blocked",
      topics: ["animals"],
    });

    // Conversation + messages for Clara
    const conv3 = backendSimulator.db.createConversation({
      childId: child2.id,
      title: "Maths chat",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv3.id,
      role: "child",
      content: "What is 2+2?",
    });
    backendSimulator.db.saveMessage({
      conversationId: conv3.id,
      role: "ai",
      content: "2+2 is 4!",
    });

    // One flag for Clara
    backendSimulator.db.createFlag({
      childId: child2.id,
      conversationId: conv3.id,
      type: "sensitive",
      reason: "Sensitive topic",
      topics: ["numbers"],
    });

    return { parent, session, child1, child2 };
  };

  test("dashboard shows a tab for each child", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const { session } = seedDashboard(backendSimulator);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    // Should see tabs for both children
    await expect(page.getByRole("tab", { name: "Ben" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("tab", { name: "Clara" })).toBeVisible();
  });

  test("first child tab is selected by default and shows summary", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const { session } = seedDashboard(backendSimulator);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    // First child (Ben) should be selected
    await expect(page.getByRole("tab", { name: "Ben" })).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 10000 },
    );

    // Summary panel should show Ben's stats
    await expect(page.getByText("3 messages")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("2 conversations")).toBeVisible();
    await expect(page.getByText("2 unreviewed flags")).toBeVisible();
  });

  test("switching tabs changes the summary panel data", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const { session } = seedDashboard(backendSimulator);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    // Wait for Ben's tab and stats to be visible
    await expect(page.getByRole("tab", { name: "Ben" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("3 messages")).toBeVisible({ timeout: 10000 });

    // Click Clara's tab
    await page.getByRole("tab", { name: "Clara" }).click();

    // Clara has 1 conversation, 2 messages, 1 flag
    await expect(page.getByText("2 messages")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 conversation")).toBeVisible();
    await expect(page.getByText("1 unreviewed flag")).toBeVisible();
  });

  test("flag count in summary panel matches seeded flag data", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const { session } = seedDashboard(backendSimulator);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    // Ben has 2 unreviewed flags
    await expect(page.getByText("2 unreviewed flags")).toBeVisible({
      timeout: 10000,
    });

    // Switch to Clara
    await page.getByRole("tab", { name: "Clara" }).click();

    // Clara has 1 unreviewed flag
    await expect(page.getByText("1 unreviewed flag")).toBeVisible({
      timeout: 10000,
    });
  });

  test("clicking Add child navigates to onboarding", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const { session } = seedDashboard(backendSimulator);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    await expect(page.getByText("Parent Dashboard")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("link", { name: "Add child" }).click();

    // Should navigate to onboarding
    await expect(page.getByText("Add a child")).toBeVisible({ timeout: 10000 });
  });

  test("summary panel shows topics from flags", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const { session } = seedDashboard(backendSimulator);
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    // Ben has topics: space, science, animals
    await expect(page.getByText("space")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("science")).toBeVisible();
    await expect(page.getByText("animals")).toBeVisible();
  });

  test("summary panel shows loading skeleton while stats load", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const { session } = seedDashboard(backendSimulator);

    // Stall the stats endpoint so we can see the loading state
    backendSimulator.simulateEndpointStalled(EndpointKey.GET_CHILD_STATS);

    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    // Should see loading skeleton in the DOM (use toBeAttached because
    // Tailwind CSS variables may not fully resolve in CT, making the card
    // report as "hidden" despite being rendered)
    await expect(page.getByTestId("child-summary-loading")).toBeAttached({
      timeout: 10000,
    });
  });

  test("empty state when parent has no children", async ({
    mount,
    page,
    backendSimulator,
  }) => {
    await backendSimulator.install(page);

    const parent = backendSimulator.db.createParent({
      name: "Solo Parent",
      email: "solo@test.com",
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

    await mount(<IwftApp initialPath="/parent/dashboard" />);

    await expect(
      page.getByText("No children yet. Add your first child to get started."),
    ).toBeVisible({ timeout: 10000 });
  });
});
