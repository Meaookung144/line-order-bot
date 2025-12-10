import { lineClient } from "../client";
import { db } from "@/lib/db";
import { products, users, transactions, stockItems } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { updateTotalSpendAndCheckTiers } from "../user-service";
import { getProductByShortCode, getProductById, formatProductMessage } from "../product-service";

export async function handleBuyCommand(
  replyToken: string,
  user: any,
  productIdentifier: string
) {
  if (!productIdentifier) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "กรุณาระบุรหัสสินค้าหรือ short code\nตัวอย่าง: /buy 1 หรือ /nf7",
    });
    return;
  }

  // Try to get product by ID or short code
  let product = null;
  const numericId = parseInt(productIdentifier);

  if (!isNaN(numericId)) {
    // Try numeric ID first
    product = await getProductById(numericId);
  }

  if (!product) {
    // Try short code
    product = await getProductByShortCode(productIdentifier);
  }

  if (!product || !product.active) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ ไม่พบสินค้าหรือสินค้าไม่พร้อมขาย",
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
      text: "❌ สินค้าหมดสต็อก",
    });
    return;
  }

  const currentBalance = parseFloat(user.creditBalance);
  const minimumCredit = parseFloat(user.minimumCredit);
  const productPrice = parseFloat(product.price);
  const newBalance = currentBalance - productPrice;

  // Check if balance would go below allowed credit limit
  // minimumCredit represents how much debt is allowed (e.g., 30 means can go to -30)
  const minAllowedBalance = -minimumCredit;
  const availableCredit = currentBalance + minimumCredit;

  if (newBalance < minAllowedBalance) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: `❌ เครดิตไม่เพียงพอ

ราคาสินค้า: ${formatCurrency(productPrice)}
ยอดเงินปัจจุบัน: ${formatCurrency(currentBalance)}
วงเงินเครดิต: ${formatCurrency(minimumCredit)}

ขอเพิ่มวงเงินเครดิตพิมพ์ '/สก' `,
    });
    return;
  }

  // Process purchase
  try {
    // Mark stock item as sold
    await db
      .update(stockItems)
      .set({
        status: "sold",
        soldToUserId: user.id,
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
      .where(eq(users.id, user.id));

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
      userId: user.id,
      type: "purchase",
      amount: productPrice.toFixed(2),
      productId: product.id,
      stockItemId: availableStock.id,
      beforeBalance: currentBalance.toFixed(2),
      afterBalance: newBalance.toFixed(2),
      description: `ซื้อ: ${product.name}`,
    });

    // Update total spend and check tiers
    const { newTotalSpend, newMinimumCredit, creditIncreased } =
      await updateTotalSpendAndCheckTiers(user.id, productPrice);

    let tierMessage = "";
    if (creditIncreased) {
      tierMessage = `\n\n🎉 ยินดีด้วย! ยอดซื้อสะสมของคุณถึง ${formatCurrency(newTotalSpend)} แล้ว\n💳 วงเงินเครดิตเพิ่มเป็น: ${formatCurrency(newMinimumCredit)}`;
    }

    // Send purchase confirmation
    const confirmMessage = `✅ ซื้อสินค้าสำเร็จ!
ราคา: ${formatCurrency(productPrice)}
คงเหลือ: ${formatCurrency(newBalance)}${tierMessage}`;

    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: confirmMessage,
    });

    // Send product details in a separate push message
    const productDetailsMessage = await formatProductMessage(
      availableStock.itemData,
      product.messageTemplate
    );

    await lineClient.pushMessage(user.lineUserId, {
      type: "text",
      text: productDetailsMessage,
    });
  } catch (error) {
    console.error("Error processing purchase:", error);
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ เกิดข้อผิดพลาดในการซื้อสินค้า กรุณาลองใหม่อีกครั้ง",
    });
  }
}
