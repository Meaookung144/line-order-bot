/**
 * Script to list all LINE users
 * Run with: npx tsx scripts/list-users.ts
 */

import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { desc } from "drizzle-orm";

async function listUsers() {
  try {
    console.log("\n📋 All LINE Users:\n");

    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    if (allUsers.length === 0) {
      console.log("No users found.");
      process.exit(0);
    }

    console.log("ID  | Admin | Display Name              | Credit Balance | LINE User ID");
    console.log("─".repeat(90));

    for (const user of allUsers) {
      const id = user.id.toString().padEnd(3);
      const adminStatus = user.isAdmin ? "✓" : " ";
      const name = user.displayName.padEnd(25).substring(0, 25);
      const balance = parseFloat(user.creditBalance).toFixed(2).padStart(14);
      const lineId = user.lineUserId.substring(0, 20);

      console.log(`${id} | [${adminStatus}]   | ${name} | ${balance} | ${lineId}...`);
    }

    console.log();
    console.log(`Total users: ${allUsers.length}`);
    console.log();
    console.log("To set a user as admin:");
    console.log("  npx tsx scripts/set-line-admin.ts {user_id}");
    console.log();

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

listUsers();
