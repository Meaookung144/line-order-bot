/**
 * Script to create the initial admin user
 * Run with: npx tsx scripts/create-admin.ts
 */

import { db } from "../lib/db";
import { admins } from "../lib/db/schema";
import { hash } from "bcryptjs";
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

async function createAdmin() {
  console.log("=== Create Initial Admin User ===\n");

  const name = await question("Enter admin name: ");
  const email = await question("Enter admin email: ");
  const password = await question("Enter admin password (min 6 chars): ");

  if (!name || !email || !password) {
    console.error("❌ All fields are required");
    rl.close();
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("❌ Password must be at least 6 characters");
    rl.close();
    process.exit(1);
  }

  try {
    console.log("\n🔄 Hashing password...");
    const passwordHash = await hash(password, 12);

    console.log("🔄 Creating admin user...");
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
    console.log(`\nYou can now login at http://localhost:3000/login`);
  } catch (error: any) {
    if (error?.code === "23505") {
      console.error("\n❌ Error: Email already exists");
    } else {
      console.error("\n❌ Error creating admin:", error.message);
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdmin();
