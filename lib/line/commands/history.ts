import { lineClient } from "../client";
import { db } from "@/lib/db";
import { transactions, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FlexMessage } from "@line/bot-sdk";

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

  // Create a single bubble with all transactions
  const transactionContents: any[] = [];

  // Add header
  transactionContents.push({
    type: "text",
    text: "📋 ประวัติการทำรายการ",
    weight: "bold",
    size: "xl",
    color: "#1DB446",
  });

  // Add each transaction
  userTransactions.forEach((record, index) => {
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

    const productName = record.product?.name || tx.description || "-";
    const amount = parseFloat(tx.amount);
    const amountText =
      tx.type === "purchase"
        ? `-${formatCurrency(amount)}`
        : `+${formatCurrency(amount)}`;
    const amountColor = tx.type === "purchase" ? "#E53E3E" : "#38A169";

    const dateStr = new Date(tx.createdAt).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Add separator between transactions
    if (index > 0) {
      transactionContents.push({
        type: "separator",
        margin: "lg",
      });
    }

    // Transaction item
    transactionContents.push({
      type: "box",
      layout: "vertical",
      margin: "lg",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: typeEmoji,
              size: "md",
              flex: 0,
            },
            {
              type: "text",
              text: typeName,
              weight: "bold",
              size: "sm",
              flex: 1,
              margin: "sm",
            },
            {
              type: "text",
              text: amountText,
              size: "sm",
              weight: "bold",
              color: amountColor,
              align: "end",
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: productName,
              size: "xs",
              color: "#666666",
              wrap: true,
              flex: 1,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: dateStr,
              size: "xxs",
              color: "#999999",
              flex: 0,
            },
            {
              type: "text",
              text: `คงเหลือ ${formatCurrency(parseFloat(tx.afterBalance))}`,
              size: "xxs",
              color: "#999999",
              align: "end",
            },
          ],
        },
      ],
    });
  });

  const flexMessage: FlexMessage = {
    type: "flex",
    altText: `📋 ประวัติการทำรายการ (${userTransactions.length} รายการล่าสุด)`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: transactionContents,
      },
    },
  };

  await lineClient.replyMessage(replyToken, flexMessage);
}
