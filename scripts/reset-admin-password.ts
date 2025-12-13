/**
 * Script to reset admin password
 * Run with: npx tsx scripts/reset-admin-password.ts
 */

import { db } from "../lib/db";
import { admins } from "../lib/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function resetPassword() {
  console.log("=== Reset Admin Password ===\n");

  try {
    // List all admins
    console.log("📋 Fetching admin users...\n");
    const allAdmins = await db.select().from(admins);

    if (allAdmins.length === 0) {
      console.error("❌ No admin users found in database");
      console.log("\nCreate a new admin user with:");
      console.log("  npx tsx scripts/create-admin.ts");
      rl.close();
      process.exit(1);
    }

    console.log("Available admin users:");
    allAdmins.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.name} (${admin.email})`);
    });
    console.log();

    // Select admin
    const selection = await question(
      `Select admin to reset (1-${allAdmins.length}): `
    );
    const selectedIndex = parseInt(selection) - 1;

    if (
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= allAdmins.length
    ) {
      console.error("❌ Invalid selection");
      rl.close();
      process.exit(1);
    }

    const selectedAdmin = allAdmins[selectedIndex];
    console.log(`\n✓ Selected: ${selectedAdmin.name} (${selectedAdmin.email})`);

    // Get new password
    const newPassword = await question(
      "\nEnter new password (min 6 chars): "
    );

    if (!newPassword || newPassword.length < 6) {
      console.error("❌ Password must be at least 6 characters");
      rl.close();
      process.exit(1);
    }

    const confirmPassword = await question("Confirm new password: ");

    if (newPassword !== confirmPassword) {
      console.error("❌ Passwords do not match");
      rl.close();
      process.exit(1);
    }

    // Hash and update
    console.log("\n🔄 Hashing new password...");
    const passwordHash = await hash(newPassword, 12);

    console.log("🔄 Updating password...");
    await db
      .update(admins)
      .set({ passwordHash })
      .where(eq(admins.id, selectedAdmin.id));

    console.log("\n✅ Password reset successfully!");
    console.log(`\nYou can now login with:`);
    console.log(`   Email: ${selectedAdmin.email}`);
    console.log(`   Password: (your new password)`);
    console.log(`\nLogin at: http://localhost:3000/login`);
  } catch (error: any) {
    console.error("\n❌ Error resetting password:", error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

resetPassword();
