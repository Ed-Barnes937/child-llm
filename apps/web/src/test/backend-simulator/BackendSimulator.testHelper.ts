import type { Page } from "@playwright/test";
import { BackendSimulatorDb } from "./BackendSimulatorDb.testHelper";
import { EndpointKey, EndpointBehaviour } from "./Endpoint.testHelper";
import { connectRoutes } from "./Route.testHelper";
import {
  createAuthRoutes,
  createChildrenRoutes,
  createChildAuthRoutes,
  createChatRoutes,
  createConversationRoutes,
  createFlagRoutes,
  createParentDashboardRoutes,
} from "./RouteHandlers.testHelper";

export class BackendSimulator {
  readonly db = new BackendSimulatorDb();

  install = async (page: Page): Promise<void> => {
    const authRoutes = createAuthRoutes(this.db);
    const childrenRoutes = createChildrenRoutes(this.db);
    const childAuthRoutes = createChildAuthRoutes(this.db);
    const chatRoutes = createChatRoutes(this.db);
    const conversationRoutes = createConversationRoutes(this.db);
    const flagRoutes = createFlagRoutes(this.db);
    const parentDashboardRoutes = createParentDashboardRoutes(this.db);

    const allRoutes = [
      ...childrenRoutes,
      ...childAuthRoutes,
      ...chatRoutes,
      ...conversationRoutes,
      ...flagRoutes,
      ...parentDashboardRoutes,
    ];

    // Register in specificity order: general first, then specific.
    // page.route() handlers fire LIFO, so /api/auth (registered last)
    // takes priority over /api for auth-prefixed URLs.
    await connectRoutes(page, "/api", allRoutes);
    await connectRoutes(page, "/api/auth", authRoutes);
  };

  simulateEndpointError = (endpoint: EndpointKey): void => {
    this.db.endpointBehaviourManager.setBehaviour(
      endpoint,
      EndpointBehaviour.ERROR,
    );
  };

  simulateEndpointStalled = (endpoint: EndpointKey): void => {
    this.db.endpointBehaviourManager.setBehaviour(
      endpoint,
      EndpointBehaviour.STALL,
    );
  };

  simulateEndpointDefault = (endpoint: EndpointKey): void => {
    this.db.endpointBehaviourManager.setBehaviour(
      endpoint,
      EndpointBehaviour.DEFAULT,
    );
  };

  simulateNetworkError = (endpoint: EndpointKey): void => {
    this.db.endpointBehaviourManager.setBehaviour(
      endpoint,
      EndpointBehaviour.NETWORK_ERROR,
    );
  };
}
