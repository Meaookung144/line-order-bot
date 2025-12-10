import { db } from "../db";
import { users, creditTiers } from "../db/schema";
import { eq, sql } from "drizzle-orm";

export async function getOrCreateUser(lineUserId: string, displayName: string) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.lineUserId, lineUserId))
    .limit(1);

  if (existingUser) {
    return existingUser;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      lineUserId,
      displayName,
      creditBalance: "0",
      minimumCredit: "0",
      totalSpend: "0",
    })
    .returning();

  return newUser;
}

export async function getUserBalance(lineUserId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.lineUserId, lineUserId))
    .limit(1);

  return user;
}

export async function updateUserCredit(
  userId: number,
  amount: string,
  type: "add" | "subtract"
) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const currentBalance = parseFloat(user.creditBalance);
  const changeAmount = parseFloat(amount);
  const newBalance =
    type === "add" ? currentBalance + changeAmount : currentBalance - changeAmount;

  await db
    .update(users)
    .set({
      creditBalance: newBalance.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return newBalance;
}

export async function updateTotalSpendAndCheckTiers(userId: number, amount: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const newTotalSpend = parseFloat(user.totalSpend) + amount;

  // Check if user qualifies for a new credit tier
  const tiers = await db
    .select()
    .from(creditTiers)
    .where(eq(creditTiers.active, true))
    .orderBy(sql`${creditTiers.minSpend} DESC`);

  let newMinimumCredit = parseFloat(user.minimumCredit);

  for (const tier of tiers) {
    const minSpend = parseFloat(tier.minSpend);
    if (newTotalSpend >= minSpend) {
      const tierCredit = parseFloat(tier.creditBonus);
      if (tierCredit < newMinimumCredit) {
        newMinimumCredit = tierCredit;
      }
      break;
    }
  }

  await db
    .update(users)
    .set({
      totalSpend: newTotalSpend.toFixed(2),
      minimumCredit: newMinimumCredit.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { newTotalSpend, newMinimumCredit };
}
