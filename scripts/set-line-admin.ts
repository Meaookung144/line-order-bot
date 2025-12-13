/**
 * Script to mark a LINE user as admin
 * Run with: npx tsx scripts/set-line-admin.ts {user_id}
 *
 * Usage:
 *   npx tsx scripts/set-line-admin.ts 1
 *   npx tsx scripts/set-line-admin.ts 1 false  (to remove admin)
 */

import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function setLineAdmin() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Usage: npx tsx scripts/set-line-admin.ts {user_id} [true|false]");
    console.error("\nExamples:");
    console.error("  npx tsx scripts/set-line-admin.ts 1       # Set user ID 1 as admin");
    console.error("  npx tsx scripts/set-line-admin.ts 1 false # Remove admin from user ID 1");
    console.error("\nList all users:");
    console.error("  npx tsx scripts/list-users.ts");
    process.exit(1);
  }

  const userId = parseInt(args[0]);
  const isAdmin = args[1] === "false" ? false : true;

  if (isNaN(userId)) {
    console.error("❌ Invalid user ID");
    process.exit(1);
  }

  try {
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.error(`❌ User ID ${userId} not found`);
      console.error("\nList all users with:");
      console.error("  npx tsx scripts/list-users.ts");
      process.exit(1);
    }

    console.log(`\n📝 Current user info:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   LINE User ID: ${user.lineUserId}`);
    console.log(`   Name: ${user.displayName}`);
    console.log(`   Current admin status: ${user.isAdmin}`);
    console.log();

    // Update admin status
    await db
      .update(users)
      .set({
        isAdmin: isAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    if (isAdmin) {
      console.log(`✅ User ${user.displayName} (ID: ${userId}) is now an admin!`);
      console.log(`\nThey can now use admin commands in direct chat:`);
      console.log(`   /give {user_id} {product_code}`);
      console.log(`   /credit-approve {user_id} {amount}`);
    } else {
      console.log(`✅ Removed admin status from ${user.displayName} (ID: ${userId})`);
    }

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

setLineAdmin();
