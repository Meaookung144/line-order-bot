import { lineClient } from "../client";
import { getProductByShortCode, getAvailableStockCount } from "../product-service";
import { formatCurrency } from "@/lib/utils";
import { productShortCodes } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function handleStockCheckCommand(
  replyToken: string,
  shortCode: string
) {
  try {
    const product = await getProductByShortCode(shortCode);

    if (!product) {
      // Don't reply for non-existent short codes to avoid noise
      return;
    }

    if (!product.active) {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "❌ สินค้านี้ปิดการขายแล้ว",
      });
      return;
    }

    // Get actual available stock count
    const availableStock = await getAvailableStockCount(product.id);

    // Get all short codes for this product
    const allShortCodes = await db
      .select()
      .from(productShortCodes)
      .where(eq(productShortCodes.productId, product.id));

    const shortCodesList = allShortCodes.map(sc => `/${sc.code}`).join(" หรือ ");

    if (availableStock > 0) {
      await lineClient.replyMessage(replyToken, {
        type: "flex",
        altText: `${product.name} - สินค้าพร้อมส่ง`,
        contents: {
          type: "bubble",
          size: "kilo",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: product.name,
                weight: "bold",
                size: "lg",
                color: "#1DB446",
                wrap: true,
              },
              {
                type: "separator",
                margin: "md",
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "sm",
                contents: [
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      {
                        type: "text",
                        text: "สถานะ",
                        color: "#aaaaaa",
                        size: "sm",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: `✅ สินค้าพร้อมส่ง ${availableStock} ชิ้น`,
                        wrap: true,
                        color: "#1DB446",
                        size: "sm",
                        flex: 3,
                        weight: "bold",
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      {
                        type: "text",
                        text: "ราคา",
                        color: "#aaaaaa",
                        size: "sm",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: formatCurrency(parseFloat(product.price)),
                        wrap: true,
                        color: "#FF6B6B",
                        size: "md",
                        flex: 3,
                        weight: "bold",
                        align: "end",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "message",
                  label: "🛍️ รับสินค้า",
                  text: `/${shortCode}`,
                },
              },
            ],
          },
        },
      });
    } else {
      await lineClient.replyMessage(replyToken, {
        type: "flex",
        altText: `${product.name} - ไม่พร้อมส่ง`,
        contents: {
          type: "bubble",
          size: "kilo",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: product.name,
                weight: "bold",
                size: "lg",
                color: "#FF6B6B",
                wrap: true,
              },
              {
                type: "separator",
                margin: "md",
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "sm",
                contents: [
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      {
                        type: "text",
                        text: "สถานะ",
                        color: "#aaaaaa",
                        size: "sm",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: "❌ ไม่พร้อมส่ง",
                        wrap: true,
                        color: "#FF6B6B",
                        size: "sm",
                        flex: 3,
                        weight: "bold",
                      },
                    ],
                  },
                  {
                    type: "text",
                    text: "สินค้าหมดชั่วคราว",
                    color: "#999999",
                    size: "xs",
                    margin: "md",
                  },
                ],
              },
            ],
          },
        },
      });
    }
  } catch (error) {
    console.error("Error checking stock:", error);
    // Silently fail - don't reply to avoid confusion
  }
}
