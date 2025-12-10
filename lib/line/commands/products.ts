import { lineClient } from "../client";
import { db } from "@/lib/db";
import { products, productShortCodes, stockItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";

export async function handleProductListCommand(replyToken: string) {
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

  // Group products by category
  const grouped = productsWithDetails.reduce((acc, product) => {
    const category = product.category || "อื่นๆ";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof productsWithDetails>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(grouped).sort();

  // Build Flex Message contents
  const bodyContents: any[] = [
    {
      type: "text",
      text: "📦 รายการสินค้า",
      weight: "bold",
      size: "xl",
      margin: "none",
    },
  ];

  for (const category of sortedCategories) {
    // Add category separator
    bodyContents.push(
      {
        type: "separator",
        margin: "lg",
      },
      {
        type: "text",
        text: category,
        weight: "bold",
        size: "md",
        margin: "md",
        color: "#1E40AF",
      }
    );

    // Add products in this category
    for (const product of grouped[category]) {
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
      const stockInfo = `สต็อก: ${product.availableStock} ชิ้น`;
      const codesInfo = product.shortCodes.length > 0
        ? ` | รหัส: ${product.shortCodes.map(sc => `/${sc.code}`).join(" ")}`
        : "";

      bodyContents.push({
        type: "text",
        text: stockInfo + codesInfo,
        size: "xs",
        color: "#6B7280",
        margin: "xs",
        wrap: true,
      });
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
    altText: "รายการสินค้า",
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
