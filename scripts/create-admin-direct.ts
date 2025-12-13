/**
 * Non-interactive script to create/reset admin user
 * Run with: npx tsx scripts/create-admin-direct.ts
 *
 * Usage:
 *   node scripts/create-admin-direct.ts "Admin Name" "admin@example.com" "password123"
 */

import { db } from "../lib/db";
import { admins } from "../lib/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

async function createOrUpdateAdmin() {
  const args = process.argv.slice(2);

  if (args.length !== 3) {
    console.error("❌ Usage: npx tsx scripts/create-admin-direct.ts <name> <email> <password>");
    console.error("\nExample:");
    console.error('  npx tsx scripts/create-admin-direct.ts "Admin" "admin@example.com" "mypassword"');
    process.exit(1);
  }

  const [name, email, password] = args;

  if (password.length < 6) {
    console.error("❌ Password must be at least 6 characters");
    process.exit(1);
  }

  try {
    console.log("🔄 Hashing password...");
    const passwordHash = await hash(password, 12);

    // Check if admin exists
    const [existingAdmin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);

    if (existingAdmin) {
      console.log(`\n⚠️  Admin with email ${email} already exists`);
      console.log("🔄 Updating password...");

      await db
        .update(admins)
        .set({ passwordHash, name })
        .where(eq(admins.email, email));

      console.log("\n✅ Admin password updated successfully!");
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Name: ${name}`);
      console.log(`   Email: ${email}`);
    } else {
      console.log("🔄 Creating new admin user...");

      const [newAdmin] = await db
        .insert(admins)
        .values({
          email,
          passwordHash,
          name,
        })
        .returning();

      console.log("\n✅ Admin user created successfully!");
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   Name: ${newAdmin.name}`);
      console.log(`   Email: ${newAdmin.email}`);
    }

    console.log(`\nYou can now login at http://localhost:3000/login`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ********`);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

createOrUpdateAdmin();
