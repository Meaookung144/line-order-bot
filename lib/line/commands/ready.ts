import { lineClient } from "../client";
import { db } from "@/lib/db";
import { products, productShortCodes, stockItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";

export async function handleReadyCommand(replyToken: string) {
  const activeProducts = await db
    .select()
    .from(products)
    .where(eq(products.active, true));

  if (activeProducts.length === 0) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "ขณะนี้ยังไม่มีสินค้าในระบบ",
    });
    return;
  }

  // Get short codes and available stock for each product
  const productsWithDetails = await Promise.all(
    activeProducts.map(async (product) => {
      // Get short codes
      const codes = await db
        .select()
        .from(productShortCodes)
        .where(eq(productShortCodes.productId, product.id));

      // Get available stock count
      const availableStock = await db
        .select()
        .from(stockItems)
        .where(
          and(
            eq(stockItems.productId, product.id),
            eq(stockItems.status, "available")
          )
        );

      return {
        ...product,
        shortCodes: codes,
        availableStock: availableStock.length,
      };
    })
  );

  // Separate by stock availability
  const inStock = productsWithDetails.filter(p => p.availableStock > 0);
  const outOfStock = productsWithDetails.filter(p => p.availableStock === 0);

  // Build Flex Message contents
  const bodyContents: any[] = [];

  // In stock section
  if (inStock.length > 0) {
    bodyContents.push({
      type: "text",
      text: `✅ พร้อมขาย (${inStock.length})`,
      weight: "bold",
      size: "lg",
      color: "#059669",
      margin: "none",
    });

    for (const product of inStock) {
      const price = formatCurrency(parseFloat(product.price));

      // Product name and price (baseline aligned)
      bodyContents.push({
        type: "box",
        layout: "baseline",
        margin: "md",
        contents: [
          {
            type: "text",
            text: product.name,
            size: "sm",
            flex: 0,
            wrap: true,
          },
          {
            type: "text",
            text: price,
            size: "sm",
            align: "end",
            color: "#059669",
            weight: "bold",
          },
        ],
      });

      // Stock count and short codes
      const codes = product.shortCodes.map(sc => `/${sc.code}`).join(" ");
      const stockInfo = `สต็อก: ${product.availableStock} ชิ้น${codes ? ` | ${codes}` : ""}`;

      bodyContents.push({
        type: "text",
        text: stockInfo,
        size: "xs",
        color: "#6B7280",
        margin: "xs",
        wrap: true,
      });
    }
  }

  // Separator
  if (inStock.length > 0 && outOfStock.length > 0) {
    bodyContents.push({
      type: "separator",
      margin: "lg",
    });
  }

  // Out of stock section
  if (outOfStock.length > 0) {
    bodyContents.push({
      type: "text",
      text: `❌ หมดสต็อก (${outOfStock.length})`,
      weight: "bold",
      size: "lg",
      color: "#DC2626",
      margin: inStock.length > 0 ? "lg" : "none",
    });

    for (const product of outOfStock) {
      const price = formatCurrency(parseFloat(product.price));

      // Product name and price (baseline aligned)
      bodyContents.push({
        type: "box",
        layout: "baseline",
        margin: "md",
        contents: [
          {
            type: "text",
            text: product.name,
            size: "sm",
            flex: 0,
            wrap: true,
            color: "#9CA3AF",
          },
          {
            type: "text",
            text: price,
            size: "sm",
            align: "end",
            color: "#9CA3AF",
          },
        ],
      });

      // Short codes
      const codes = product.shortCodes.map(sc => `/${sc.code}`).join(" ");
      if (codes) {
        bodyContents.push({
          type: "text",
          text: `รหัส: ${codes}`,
          size: "xs",
          color: "#9CA3AF",
          margin: "xs",
          wrap: true,
        });
      }
    }
  }

  // Add purchase instruction
  bodyContents.push(
    {
      type: "separator",
      margin: "lg",
    },
    {
      type: "text",
      text: "💡 วิธีซื้อ: พิมพ์รหัสสินค้า เช่น /nf7",
      size: "xs",
      color: "#6B7280",
      margin: "md",
      wrap: true,
    }
  );

  await lineClient.replyMessage(replyToken, {
    type: "flex",
    altText: "สถานะสินค้า",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
      },
    },
  });
}
