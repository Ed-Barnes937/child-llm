import {
  test as base,
  expect,
  type ComponentFixtures,
} from "@playwright/experimental-ct-react";
import type {
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  TestType,
} from "@playwright/test";
import { BackendSimulator } from "./backend-simulator/BackendSimulator.testHelper";

interface IwftFixtures {
  backendSimulator: BackendSimulator;
}

export const test: TestType<
  ComponentFixtures & IwftFixtures & PlaywrightTestArgs & PlaywrightTestOptions,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {}
> = base.extend<IwftFixtures>({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  backendSimulator: async ({ page }, use) => {
    const simulator = new BackendSimulator();
    // Defer install — tests call simulator.install(page) after mount().
    // page.route() handlers only work reliably after CT mount.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(simulator);
  },
});

export { expect };
