import type { Page, Route as PlaywrightRoute } from "@playwright/test";

export enum Method {
  GET = "GET",
  POST = "POST",
}

export interface HttpRequest<Body = undefined> {
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body: Body;
  url: string;
}

export interface RouteResponse {
  status: number;
  headers?: Record<string, string>;
  body: string;
}

export interface RouteDefinition<Body = unknown> {
  method: Method;
  urlPattern: string;
  handler: (request: HttpRequest<Body>) => RouteResponse;
}

export class ClientError extends Error {
  constructor(
    readonly errorCode: string,
    readonly status: number = 400,
  ) {
    super(errorCode);
  }
}

export class StallResponse extends Error {}
export class NetworkError extends Error {}

export const get = <Result extends RouteResponse>(
  urlPattern: string,
  handler: (req: HttpRequest) => Result,
): RouteDefinition => ({
  method: Method.GET,
  urlPattern,
  handler: handler as (req: HttpRequest<unknown>) => RouteResponse,
});

export const post = <Body, Result extends RouteResponse>(
  urlPattern: string,
  handler: (req: HttpRequest<Body>) => Result,
): RouteDefinition<Body> => ({
  method: Method.POST,
  urlPattern,
  handler: handler as unknown as (req: HttpRequest<unknown>) => RouteResponse,
});

const convertUrlPatternToRegex = (
  urlPattern: string,
): RegExp => {
  const regexStr = urlPattern.replace(/:(\w+)/g, "(?<$1>[^/]+)");
  return new RegExp(`^${regexStr}$`);
};

const findMatchingRoute = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: RouteDefinition<any>[],
  method: string,
  pathname: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): { route: RouteDefinition<any>; pathParams: Record<string, string> } | undefined => {
  for (const route of routes) {
    if (route.method !== method) continue;
    const regex = convertUrlPatternToRegex(route.urlPattern);
    const match = pathname.match(regex);
    if (match) {
      return { route, pathParams: match.groups ?? {} };
    }
  }
  return undefined;
};

const parseQueryParams = (url: URL): Record<string, string> => {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

export const connectRoutes = async (
  page: Page,
  prefix: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: RouteDefinition<any>[],
): Promise<void> => {
  await page.route(`**${prefix}/**`, async (playwrightRoute: PlaywrightRoute) => {
    const request = playwrightRoute.request();
    const url = new URL(request.url());
    const strippedPathname = url.pathname.slice(prefix.length);
    const method = request.method();

    const match = findMatchingRoute(routes, method, strippedPathname);

    if (!match) {
      await playwrightRoute.continue();
      return;
    }

    try {
      let body: unknown = undefined;
      if (method === "POST") {
        const postData = request.postData();
        if (postData) {
          try {
            body = JSON.parse(postData);
          } catch {
            body = postData;
          }
        }
      }

      const httpRequest: HttpRequest<unknown> = {
        pathParams: match.pathParams,
        queryParams: parseQueryParams(url),
        headers: request.headers(),
        body,
        url: url.toString(),
      };

      const result = match.route.handler(httpRequest);

      await playwrightRoute.fulfill({
        status: result.status,
        headers: {
          "Content-Type": "application/json",
          ...result.headers,
        },
        body: result.body,
      });
    } catch (error) {
      if (error instanceof ClientError) {
        await playwrightRoute.fulfill({
          status: error.status,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: error.errorCode, message: error.errorCode }),
        });
      } else if (error instanceof StallResponse) {
        // Never resolve — request hangs forever (tests loading states)
        await new Promise(() => undefined);
      } else if (error instanceof NetworkError) {
        await playwrightRoute.abort("failed");
      } else {
        throw error;
      }
    }
  });
};
