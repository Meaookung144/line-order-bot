import { lineClient } from "../client";
import { db } from "@/lib/db";
import { products, users, transactions, stockItems } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { updateTotalSpendAndCheckTiers } from "../user-service";
import { getProductByShortCode, getProductById, formatProductMessage } from "../product-service";

/**
 * Admin command to manually give product to user and deduct credit
 * Usage: /give {userId} {productCode}
 * Example: /give 1 nf7
 */
export async function handleAdminGiveCommand(
  replyToken: string,
  userId: number,
  productIdentifier: string
) {
  // Validate input
  if (!userId || isNaN(userId)) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ รูปแบบคำสั่งไม่ถูกต้อง\nใช้: /g {user_id} {product_code}\nตัวอย่าง: /give 1 nf7",
    });
    return;
  }

  if (!productIdentifier) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ กรุณาระบุรหัสสินค้า\nใช้: /g {user_id} {product_code}\nตัวอย่าง: /give 1 nf7",
    });
    return;
  }

  // Get user
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!targetUser) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: `❌ ไม่พบผู้ใช้ ID: ${userId}`,
    });
    return;
  }

  // Try to get product by ID or short code
  let product = null;
  const numericId = parseInt(productIdentifier);

  if (!isNaN(numericId)) {
    product = await getProductById(numericId);
  }

  if (!product) {
    product = await getProductByShortCode(productIdentifier);
  }

  if (!product || !product.active) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: `❌ ไม่พบสินค้า: ${productIdentifier}`,
    });
    return;
  }

  // Get an available stock item
  const [availableStock] = await db
    .select()
    .from(stockItems)
    .where(
      and(
        eq(stockItems.productId, product.id),
        eq(stockItems.status, "available")
      )
    )
    .limit(1);

  if (!availableStock) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: `❌ สินค้า ${product.name} หมดสต็อก`,
    });
    return;
  }

  const currentBalance = parseFloat(targetUser.creditBalance);
  const minimumCredit = parseFloat(targetUser.minimumCredit);
  const productPrice = parseFloat(product.price);
  const newBalance = currentBalance - productPrice;

  // Process purchase - Admin can force purchase even if user has insufficient credit
  try {
    // Mark stock item as sold
    await db
      .update(stockItems)
      .set({
        status: "sold",
        soldToUserId: targetUser.id,
        soldAt: new Date(),
      })
      .where(eq(stockItems.id, availableStock.id));

    // Update user balance
    await db
      .update(users)
      .set({
        creditBalance: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUser.id));

    // Update product stock count
    await db
      .update(products)
      .set({
        stock: sql`${products.stock} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));

    // Create transaction
    await db.insert(transactions).values({
      userId: targetUser.id,
      type: "purchase",
      amount: productPrice.toFixed(2),
      productId: product.id,
      stockItemId: availableStock.id,
      beforeBalance: currentBalance.toFixed(2),
      afterBalance: newBalance.toFixed(2),
      description: `ซื้อ: ${product.name} (แอดมินส่งให้)`,
    });

    // Update total spend and check tiers
    await updateTotalSpendAndCheckTiers(targetUser.id, productPrice);

    // Send product details to user
    const productDetailsMessage = await formatProductMessage(
      availableStock.itemData,
      product.messageTemplate
    );

    await lineClient.pushMessage(targetUser.lineUserId, [
      {
        type: "text",
        text: productDetailsMessage,
      },
    ]);

    // Confirm to admin
    const warningText = newBalance < 0
      ? `\n\n⚠️ ผู้ใช้มียอดติดลบ: ${formatCurrency(newBalance)}`
      : "";

    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: `✅ ส่งสินค้าสำเร็จ!

ผู้รับ: ${targetUser.displayName} (ID: ${targetUser.id})
สินค้า: ${product.name}
ราคา: ${formatCurrency(productPrice)}

ยอดเงินเดิม: ${formatCurrency(currentBalance)}
ยอดเงินใหม่: ${formatCurrency(newBalance)}${warningText}`,
    });

  } catch (error) {
    console.error("Error processing admin give:", error);
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ เกิดข้อผิดพลาดในการส่งสินค้า กรุณาลองใหม่อีกครั้ง",
    });
  }
}
