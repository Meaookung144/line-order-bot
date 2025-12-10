import { MessageEvent, TextMessage, ImageMessage, Message } from "@line/bot-sdk";
import { lineClient } from "./client";
import { getOrCreateUser, getUserBalance } from "./user-service";
import { handleBalanceCommand } from "./commands/balance";
import { handleHistoryCommand } from "./commands/history";
import { handleLoadCommand } from "./commands/load";
import { handleBuyCommand } from "./commands/buy";
import { handleProductListCommand } from "./commands/products";
import { handleSlipVerification } from "./commands/slip-verify";
import { handleStockCheckCommand } from "./commands/check-stock";
import { handleReadyCommand } from "./commands/ready";

export async function handleMessage(event: MessageEvent) {
  const { replyToken, source, message } = event;
  const userId = source.userId;

  console.log("🔍 Event replyToken:", replyToken);
  console.log("🔍 Event type:", event.type);

  if (!userId) {
    console.log("⚠️ No user ID in message event");
    return;
  }

  if (!replyToken) {
    console.log("⚠️ No reply token in message event");
    return;
  }

  try {
    console.log("📨 Processing message from user:", userId);

    // Get or create user
    const profile = await lineClient.getProfile(userId);
    console.log("👤 User profile:", profile.displayName);

    const user = await getOrCreateUser(userId, profile.displayName);
    console.log("✅ User loaded/created:", user.id);

    if (message.type === "text") {
      await handleTextMessage(replyToken, message, user);
    } else if (message.type === "image") {
      await handleImageMessage(replyToken, message, user);
    }
  } catch (error: any) {
    console.error("❌ Error handling message:", error.message);

    // If it's a LINE API error, log the details
    if (error.statusCode === 400 || error.response?.status === 400) {
      console.error("⚠️ LINE API returned 400");
      console.error("LINE API Error Details:", JSON.stringify(error.response?.data || error.originalError?.response?.data, null, 2));
      return;
    }

    console.error("Error details:", error);

    try {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      });
    } catch (replyError: any) {
      console.error("❌ Failed to send error message");
      console.error("Reply error status:", replyError.response?.status);
      console.error("Reply error data:", JSON.stringify(replyError.response?.data, null, 2));
    }
  }
}

async function handleTextMessage(
  replyToken: string,
  message: TextMessage,
  user: any
) {
  const text = message.text.trim();

  // Handle commands
  if (text === "/balance" || text.toLowerCase() === "เช็คเครดิต") {
    await handleBalanceCommand(replyToken, user);
  } else if (text === "/history" || text.toLowerCase() === "ประวัติ") {
    await handleHistoryCommand(replyToken, user);
  } else if (text.startsWith("/load ")) {
    const token = text.substring(6).trim();
    await handleLoadCommand(replyToken, user, token);
  } else if (text.startsWith("/buy ")) {
    const productId = text.substring(5).trim();
    await handleBuyCommand(replyToken, user, productId);
  } else if (text === "/products" || text.toLowerCase() === "สินค้า") {
    await handleProductListCommand(replyToken);
  } else if (text === "/ready" || text.toLowerCase() === "พส") {
    await handleReadyCommand(replyToken);
  } else if (text === "/help" || text.toLowerCase() === "ช่วยเหลือ") {
    await handleHelpCommand(replyToken);
  } else if (text.startsWith("/") && text.length > 1) {
    // Handle short code purchase (e.g., /nf7, /นฟ7)
    const shortCode = text.substring(1).toLowerCase();
    await handleBuyCommand(replyToken, user, shortCode);
  } else if (text.length > 0 && !text.startsWith("/")) {
    // Handle short code stock check (e.g., nf7, นฟ7)
    const shortCode = text.toLowerCase();
    await handleStockCheckCommand(replyToken, shortCode);
  }
}

async function handleImageMessage(
  replyToken: string,
  message: ImageMessage,
  user: any
) {
  await handleSlipVerification(replyToken, message, user);
}

async function handleHelpCommand(replyToken: string) {
  const helpText = `คำสั่งที่ใช้ได้:

💰 /balance - เช็คเครดิตคงเหลือ
📋 /history - ดูประวัติการทำรายการ
🛒 /products - ดูรายการสินค้า
🛍️ /buy {รหัสสินค้า} - ซื้อสินค้า
💳 ส่งรูปสลิปโอนเงิน - เติมเงินอัตโนมัติ
❓ /help - แสดงคำสั่งนี้`;

  await lineClient.replyMessage(replyToken, {
    type: "text",
    text: helpText,
  });
}
