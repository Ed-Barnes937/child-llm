import { EndpointKey, EndpointBehaviour } from "./Endpoint.testHelper";
import { ClientError, StallResponse, NetworkError } from "./Route.testHelper";

export class EndpointBehaviourManager {
  private readonly behaviours = new Map<EndpointKey, EndpointBehaviour>();

  constructor() {
    for (const key of Object.values(EndpointKey)) {
      this.behaviours.set(key, EndpointBehaviour.DEFAULT);
    }
  }

  setBehaviour = (
    endpoint: EndpointKey,
    behaviour: EndpointBehaviour,
  ): void => {
    this.behaviours.set(endpoint, behaviour);
  };

  getBehaviour = (endpoint: EndpointKey): EndpointBehaviour => {
    return this.behaviours.get(endpoint) ?? EndpointBehaviour.DEFAULT;
  };

  reset = (): void => {
    for (const key of Object.values(EndpointKey)) {
      this.behaviours.set(key, EndpointBehaviour.DEFAULT);
    }
  };
}

export const handleEndpointBehaviour = <T>(
  behaviour: EndpointBehaviour,
  fn: () => T,
): T => {
  switch (behaviour) {
    case EndpointBehaviour.DEFAULT:
      return fn();
    case EndpointBehaviour.ERROR:
      throw new ClientError("error.injectedForTest", 500);
    case EndpointBehaviour.STALL:
      throw new StallResponse();
    case EndpointBehaviour.NETWORK_ERROR:
      throw new NetworkError();
  }
};
