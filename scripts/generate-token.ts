/**
 * Script to generate credit tokens
 * Run with: npx tsx scripts/generate-token.ts
 */

import { db } from "../lib/db";
import { creditTokens, admins } from "../lib/db/schema";
import { randomBytes } from "crypto";
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

function generateToken(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function createToken() {
  console.log("=== Generate Credit Token ===\n");

  // Get the first admin
  const [admin] = await db.select().from(admins).limit(1);

  if (!admin) {
    console.error("❌ No admin found. Please create an admin first.");
    rl.close();
    process.exit(1);
  }

  console.log(`Creating token as admin: ${admin.name} (${admin.email})\n`);

  const creditAmount = await question("Enter credit amount (e.g., 1000): ");
  const minCreditBonus = await question(
    "Enter minimum credit bonus (e.g., -500 for allowing -500 baht limit): "
  );
  const daysValid = await question(
    "Enter number of days token is valid (e.g., 30): "
  );

  if (!creditAmount || !daysValid) {
    console.error("❌ Credit amount and validity days are required");
    rl.close();
    process.exit(1);
  }

  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + parseInt(daysValid) * 24 * 60 * 60 * 1000
  );

  try {
    console.log("\n🔄 Creating token...");
    const [newToken] = await db
      .insert(creditTokens)
      .values({
        token,
        creditAmount: parseFloat(creditAmount).toFixed(2),
        minimumCreditBonus: parseFloat(minCreditBonus || "0").toFixed(2),
        createdByAdminId: admin.id,
        expiresAt,
      })
      .returning();

    console.log("\n✅ Token created successfully!");
    console.log(`\n═══════════════════════════════`);
    console.log(`   Token: ${newToken.token}`);
    console.log(`   Credit Amount: ฿${newToken.creditAmount}`);
    console.log(`   Min Credit Bonus: ฿${newToken.minimumCreditBonus}`);
    console.log(`   Expires: ${expiresAt.toLocaleDateString("th-TH")}`);
    console.log(`═══════════════════════════════`);
    console.log(`\nUsers can redeem with: /load ${newToken.token}`);
  } catch (error: any) {
    console.error("\n❌ Error creating token:", error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createToken();
