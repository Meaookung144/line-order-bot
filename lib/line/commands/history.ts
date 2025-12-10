import { lineClient } from "../client";
import { db } from "@/lib/db";
import { transactions, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function handleHistoryCommand(replyToken: string, user: any) {
  const userTransactions = await db
    .select({
      transaction: transactions,
      product: products,
    })
    .from(transactions)
    .leftJoin(products, eq(transactions.productId, products.id))
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  if (userTransactions.length === 0) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "ยังไม่มีประวัติการทำรายการ",
    });
    return;
  }

  const historyText = userTransactions
    .map((record) => {
      const tx = record.transaction;
      const typeEmoji =
        tx.type === "purchase"
          ? "🛒"
          : tx.type === "topup"
          ? "💳"
          : tx.type === "adjustment"
          ? "⚙️"
          : "🔄";
      const typeName =
        tx.type === "purchase"
          ? "ซื้อสินค้า"
          : tx.type === "topup"
          ? "เติมเงิน"
          : tx.type === "adjustment"
          ? "ปรับยอด"
          : "คืนเงิน";

      const productName = record.product?.name || "-";
      const amount = parseFloat(tx.amount);
      const amountText =
        tx.type === "purchase"
          ? `-${formatCurrency(amount)}`
          : `+${formatCurrency(amount)}`;

      return `${typeEmoji} ${typeName}
${tx.type === "purchase" ? `สินค้า: ${productName}` : ""}
จำนวน: ${amountText}
คงเหลือ: ${formatCurrency(parseFloat(tx.afterBalance))}
${new Date(tx.createdAt).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    })
    .join("\n\n");

  const message = `📋 ประวัติการทำรายการ (10 รายการล่าสุด)\n\n${historyText}`;

  await lineClient.replyMessage(replyToken, {
    type: "text",
    text: message,
  });
}
