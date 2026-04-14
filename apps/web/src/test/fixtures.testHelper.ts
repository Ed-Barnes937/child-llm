import {
  test as base,
  expect,
  type ComponentFixtures,
} from "@playwright/experimental-ct-react";
import type { PlaywrightTestArgs, PlaywrightTestOptions, TestType } from "@playwright/test";
import { BackendSimulator } from "./BackendSimulator.testHelper";

interface IwftFixtures {
  backendSimulator: BackendSimulator;
}

export const test: TestType<
  ComponentFixtures & IwftFixtures & PlaywrightTestArgs & PlaywrightTestOptions,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {}
> = base.extend<IwftFixtures>({
  backendSimulator: async ({ page }, use) => {
    const simulator = new BackendSimulator();
    // Defer install — tests call simulator.install(page) after mount().
    // page.route() handlers only work reliably after CT mount.
    await use(simulator);
  },
});

export { expect };
