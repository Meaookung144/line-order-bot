import { db } from "@/lib/db";
import { products, productShortCodes, stockItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getProductByShortCode(code: string) {
  const [shortCode] = await db
    .select({
      productId: productShortCodes.productId,
    })
    .from(productShortCodes)
    .where(eq(productShortCodes.code, code.toLowerCase()))
    .limit(1);

  if (!shortCode) {
    return null;
  }

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, shortCode.productId))
    .limit(1);

  return product;
}

export async function getProductById(productId: number) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return product;
}

export async function getAvailableStockCount(productId: number): Promise<number> {
  const items = await db
    .select()
    .from(stockItems)
    .where(
      and(
        eq(stockItems.productId, productId),
        eq(stockItems.status, "available")
      )
    );

  return items.length;
}

export async function formatProductMessage(itemData: any, template: string | null): Promise<string> {
  if (!template) {
    // Default template if none specified
    let message = "🎉 คุณได้รับสินค้าแล้ว!\n\n";
    if (itemData.user) message += `👤 User: ${itemData.user}\n`;
    if (itemData.pass) message += `🔑 Password: ${itemData.pass}\n`;
    if (itemData.screen) message += `📺 Screen/Profile: ${itemData.screen}\n`;
    if (itemData.pin) message += `🔢 PIN: ${itemData.pin}\n`;
    return message;
  }

  // Replace placeholders in template
  return template
    .replace(/{user}/g, itemData.user || "")
    .replace(/{pass}/g, itemData.pass || "")
    .replace(/{screen}/g, itemData.screen || "")
    .replace(/{pin}/g, itemData.pin || "");
}
