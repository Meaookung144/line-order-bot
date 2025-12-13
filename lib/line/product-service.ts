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
  // Always use template from database
  if (!template) {
    return "🎉 คุณได้รับสินค้าแล้ว!\n\n(กรุณาตั้งค่า message template ในฐานข้อมูล)";
  }

  // Replace placeholders in template with actual data
  return template
    .replace(/{user}/g, itemData.user || "")
    .replace(/{pass}/g, itemData.pass || "")
    .replace(/{screen}/g, itemData.screen || "")
    .replace(/{pin}/g, itemData.pin || "");
}
