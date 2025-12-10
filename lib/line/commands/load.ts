import { lineClient } from "../client";
import { db } from "@/lib/db";
import { creditTokens, users, transactions } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";

export async function handleLoadCommand(
  replyToken: string,
  user: any,
  token: string
) {
  if (!token) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "กรุณาระบุโทเค็น\nตัวอย่าง: /load ABC123",
    });
    return;
  }

  // Find the token
  const [creditToken] = await db
    .select()
    .from(creditTokens)
    .where(
      and(
        eq(creditTokens.token, token.toUpperCase()),
        isNull(creditTokens.usedAt)
      )
    )
    .limit(1);

  if (!creditToken) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ โทเค็นไม่ถูกต้องหรือถูกใช้ไปแล้ว",
    });
    return;
  }

  // Check if expired
  if (new Date() > new Date(creditToken.expiresAt)) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ โทเค็นหมดอายุแล้ว",
    });
    return;
  }

  // Calculate new balances
  const currentBalance = parseFloat(user.creditBalance);
  const currentMinCredit = parseFloat(user.minimumCredit);
  const creditAmount = parseFloat(creditToken.creditAmount);
  const minCreditBonus = parseFloat(creditToken.minimumCreditBonus);

  const newBalance = currentBalance + creditAmount;
  const newMinCredit = currentMinCredit + minCreditBonus;

  // Update user
  await db
    .update(users)
    .set({
      creditBalance: newBalance.toFixed(2),
      minimumCredit: newMinCredit.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Mark token as used
  await db
    .update(creditTokens)
    .set({
      usedByUserId: user.id,
      usedAt: new Date(),
    })
    .where(eq(creditTokens.id, creditToken.id));

  // Create transaction record
  await db.insert(transactions).values({
    userId: user.id,
    type: "topup",
    amount: creditAmount.toFixed(2),
    beforeBalance: currentBalance.toFixed(2),
    afterBalance: newBalance.toFixed(2),
    description: `ใช้โทเค็น: ${token}`,
  });

  const message = `✅ เติมเครดิตสำเร็จ!

เครดิตที่ได้รับ: ${formatCurrency(creditAmount)}
${
  minCreditBonus > 0
    ? `วงเงินขั้นต่ำเพิ่ม: ${formatCurrency(minCreditBonus)}`
    : ""
}

เครดิตใหม่: ${formatCurrency(newBalance)}
วงเงินขั้นต่ำใหม่: ${formatCurrency(newMinCredit)}`;

  await lineClient.replyMessage(replyToken, {
    type: "text",
    text: message,
  });
}
