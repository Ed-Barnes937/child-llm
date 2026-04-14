import { createServerFn } from "@tanstack/react-start";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { children, devices } from "@child-safe-llm/db";
import { eq } from "drizzle-orm";
import type { PresetName } from "@child-safe-llm/shared";

const getDb = () => {
  const sql = postgres(process.env.DATABASE_URL!);
  return drizzle(sql);
};

/**
 * Login with username + password (new/own device).
 */
export const childLoginWithPassword = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { username: string; password: string; deviceToken: string }) => d,
  )
  .handler(async (ctx) => {
    const data = ctx.data;
    const db = getDb();
    const [child] = await db
      .select()
      .from(children)
      .where(eq(children.username, data.username))
      .limit(1);

    if (!child) {
      return { error: "Invalid username or password." };
    }

    // TODO: proper password hashing comparison
    if (child.passwordHash !== data.password) {
      return { error: "Invalid username or password." };
    }

    // Register device if not already registered
    const [existingDevice] = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceToken, data.deviceToken))
      .limit(1);

    if (!existingDevice) {
      await db.insert(devices).values({
        parentId: child.parentId,
        deviceToken: data.deviceToken,
      });
    }

    return {
      child: {
        id: child.id,
        displayName: child.displayName,
        username: child.username,
        presetName: child.presetName as PresetName,
        parentId: child.parentId,
      },
    };
  });

/**
 * Login with PIN (known/shared device).
 */
export const childLoginWithPin = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { childId: string; pin: string; deviceToken: string }) => d,
  )
  .handler(async (ctx) => {
    const data = ctx.data;
    const db = getDb();
    const [child] = await db
      .select()
      .from(children)
      .where(eq(children.id, data.childId))
      .limit(1);

    if (!child) {
      return { error: "Child not found." };
    }

    // TODO: proper PIN hashing comparison
    if (child.pinHash !== data.pin) {
      return { error: "Incorrect PIN." };
    }

    return {
      child: {
        id: child.id,
        displayName: child.displayName,
        username: child.username,
        presetName: child.presetName as PresetName,
        parentId: child.parentId,
      },
    };
  });

/**
 * Get children for a device (by device token).
 */
export const getChildrenForDevice = createServerFn({ method: "GET" })
  .inputValidator((d: { deviceToken: string }) => d)
  .handler(async (ctx) => {
    const data = ctx.data;
    const db = getDb();

    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceToken, data.deviceToken))
      .limit(1);

    if (!device) {
      return { children: [] };
    }

    const result = await db
      .select({
        id: children.id,
        displayName: children.displayName,
        presetName: children.presetName,
      })
      .from(children)
      .where(eq(children.parentId, device.parentId));

    return { children: result };
  });
