import { db } from "./db";
import { settings } from "./db/schema";
import { eq } from "drizzle-orm";

export async function getSetting(key: string): Promise<string | null> {
  const [result] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  return result?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await getSetting(key);

  if (existing !== null) {
    // Update existing
    await db
      .update(settings)
      .set({
        value,
        updatedAt: new Date(),
      })
      .where(eq(settings.key, key));
  } else {
    // Insert new
    await db.insert(settings).values({
      key,
      value,
    });
  }
}

export async function getAdminGroupId(): Promise<string | null> {
  return getSetting("admin_group_id");
}

export async function setAdminGroupId(groupId: string): Promise<void> {
  return setSetting("admin_group_id", groupId);
}
