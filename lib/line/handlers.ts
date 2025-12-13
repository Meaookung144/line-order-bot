import { MessageEvent, TextMessage } from "@line/bot-sdk";
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
import { handleAdminCommand, handleAdminGroupSetup } from "./commands/admin";
import { handleRequestCreditCommand } from "./commands/request-credit";
import { handleAdminGiveCommand } from "./commands/admin-give";
import { handleAdminGiveByLineId } from "./commands/admin-give-line";
import { db } from "@/lib/db";
import { users, slips, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { getAdminGroupId } from "@/lib/settings";
import { getPendingApproval, clearPendingApproval } from "./approval-state";
import { setAdminTargetUser, getAdminTargetUser, clearAdminTargetUser } from "./admin-context";

export async function handleMessage(event: MessageEvent) {
  const { replyToken, source, message } = event;
  const userId = source.userId;
  const groupId = source.type === "group" ? source.groupId : null;

  console.log("🔍 Event replyToken:", replyToken);
  console.log("🔍 Event type:", event.type);
  console.log("🔍 Source type:", source.type);
  console.log("🔍 Group ID:", groupId);

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

    // Check if this is an admin group setup command in a group chat
    if (groupId && message.type === "text") {
      const text = message.text.trim();
      if (text.startsWith("/admin ")) {
        const args = text.substring(7).trim();
        const setupToken = process.env.SET_ADMIN_GROUP_TOKEN;
        if (setupToken && args === setupToken) {
          try {
            await handleAdminGroupSetup(groupId, args);
            await lineClient.replyMessage(replyToken, {
              type: "text",
              text: "✅ กลุ่มนี้ถูกตั้งเป็นกลุ่มแอดมินเรียบร้อยแล้ว",
            });
            return;
          } catch (error) {
            console.error("Error setting up admin group:", error);
          }
        }
      }
    }

    // Get or create user
    const profile = await lineClient.getProfile(userId);
    console.log("👤 User profile:", profile.displayName);

    const user = await getOrCreateUser(userId, profile.displayName);
    console.log("✅ User loaded/created:", user.id);

    if (message.type === "text") {
      await handleTextMessage(replyToken, message, user, groupId);
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
  user: any,
  groupId: string | null
) {
  const text = message.text.trim();

  // Check if this is in admin group and user has a pending approval
  const adminGroupId = await getAdminGroupId();
  if (adminGroupId && groupId === adminGroupId) {
    const pendingApproval = getPendingApproval(user.lineUserId);

    if (pendingApproval) {
      // Check if the message is a number (amount)
      const amount = parseFloat(text);
      if (!isNaN(amount) && amount > 0) {
        // Process the approval
        await processSlipApproval(replyToken, pendingApproval.slipId, pendingApproval.userId, amount, user.lineUserId);
        return;
      } else if (!text.startsWith('/')) {
        // Ignore non-command, non-numeric messages in admin group
        return;
      }
    }
  }

  // Handle commands
  if (text === "/bal" || text.toLowerCase() === "ยอดเงิน") {
    await handleBalanceCommand(replyToken, user);
  } else if (text === "/history" || text.toLowerCase() === "ประวัติ") {
    await handleHistoryCommand(replyToken, user);
  } else if (text.startsWith("/load ")) {
    const token = text.substring(6).trim();
    await handleLoadCommand(replyToken, user, token);
  } else if (text.startsWith("/buy ")) {
    const productId = text.substring(5).trim();
    await handleBuyCommand(replyToken, user, productId);
  } else if (text === "/product" || text.toLowerCase() === "/สค") {
    await handleProductListCommand(replyToken);
  } else if (text === "/ready" || text.toLowerCase() === "/พส") {
    await handleReadyCommand(replyToken);
  } else if (text === "/help" || text.toLowerCase() === "/บอท") {
    await handleHelpCommand(replyToken);
  } else if (text.startsWith("/admin") || text.toLowerCase().startsWith("แอดมิน")) {
    const args = text.startsWith("/admin")
      ? text.substring(6).trim()
      : text.substring(6).trim();
    await handleAdminCommand(replyToken, user, args);
  } else if (text.startsWith("/makemeadmin ")) {
    const token = text.substring(13).trim();
    const correctToken = process.env.MAKEME_ADMIN_TOKEN;

    if (!correctToken) {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "❌ ฟีเจอร์นี้ยังไม่ได้ตั้งค่า",
      });
      return;
    }

    if (token === correctToken) {
      // Check if already admin
      if (user.isAdmin === true) {
        await lineClient.replyMessage(replyToken, {
          type: "text",
          text: "✅ คุณเป็นแอดมินอยู่แล้ว",
        });
        return;
      }

      // Update user to admin
      await db
        .update(users)
        .set({
          isAdmin: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: `✅ ยินดีด้วย! คุณเป็นแอดมินแล้ว

คุณสามารถใช้คำสั่งแอดมินได้:
🎁 /g {user_id} {product_code}
💵 /credit-approve {user_id} {amount}

พิมพ์ /ah เพื่อดูคำสั่งแอดมินทั้งหมด`,
      });
    } else {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "❌ รหัสไม่ถูกต้อง",
      });
    }
  } else if (text.startsWith("/request-credit") || text.startsWith("/สก")) {
    const message = text.startsWith("/request-credit")
      ? text.substring(15).trim()
      : text.substring(3).trim();
    await handleRequestCreditCommand(replyToken, user, message);
  } else if (text.startsWith("/credit-approve ")) {
    // Check if user is admin or command is from admin group
    const adminGroupId = await getAdminGroupId();
    const isInAdminGroup = adminGroupId && groupId === adminGroupId;
    const isUserAdmin = user.isAdmin === true;

    if (!isInAdminGroup && !isUserAdmin) {
      return; // Silently ignore if not admin
    }

    const args = text.substring(16).trim().split(" ");
    if (args.length >= 2) {
      const targetUserId = parseInt(args[0]);
      const amount = parseFloat(args[1]);
      await handleCreditApproveCommand(replyToken, targetUserId, amount);
    } else {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "รูปแบบคำสั่งไม่ถูกต้อง\nใช้: /credit-approve {user_id} {amount}",
      });
    }
  } else if (text === "/ah" || text === "/รวมคำสั่งadmin") {
    // Check if user is admin or command is from admin group
    const adminGroupId = await getAdminGroupId();
    const isInAdminGroup = adminGroupId && groupId === adminGroupId;
    const isUserAdmin = user.isAdmin === true;

    if (!isInAdminGroup && !isUserAdmin) {
      return; // Silently ignore if not admin
    }

    await handleAdminHelpCommand(replyToken);
  } else if (text.startsWith("/g ") || text.startsWith("/give ")) {
    // Check if user is admin or command is from admin group
    const adminGroupId = await getAdminGroupId();
    const isInAdminGroup = adminGroupId && groupId === adminGroupId;
    const isUserAdmin = user.isAdmin === true;

    if (!isInAdminGroup && !isUserAdmin) {
      return; // Silently ignore if not admin
    }

    const args = text.substring(6).trim().split(/\s+/);
    if (args.length >= 2) {
      const targetUserId = parseInt(args[0]);
      const productCode = args[1];
      await handleAdminGiveCommand(replyToken, targetUserId, productCode);
    } else {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "รูปแบบคำสั่งไม่ถูกต้อง\nใช้: /give {user_id} {product_code}\nตัวอย่าง: /give 1 nf7",
      });
    }
  } else if (text.startsWith("/target ")) {
    // Admin command to target a customer by LINE User ID
    if (user.isAdmin !== true) {
      return; // Silently ignore if not admin
    }

    const targetLineId = text.substring(8).trim();
    if (!targetLineId || !targetLineId.startsWith('U')) {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "❌ รูปแบบไม่ถูกต้อง\nใช้: /target {LINE_USER_ID}\nตัวอย่าง: /target U3123f451c952d28b86866578d91ff2a5",
      });
      return;
    }

    // Get target user by LINE User ID
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.lineUserId, targetLineId))
      .limit(1);

    if (!targetUser) {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: `❌ ไม่พบผู้ใช้ LINE ID: ${targetLineId}`,
      });
      return;
    }

    setAdminTargetUser(user.lineUserId, targetUser.lineUserId, targetUser.displayName);

    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: `✅ กำลังช่วยลูกค้า: ${targetUser.displayName}
LINE ID: ${targetUser.lineUserId}

ตอนนี้คุณสามารถพิมพ์รหัสสินค้า เช่น "nf7" เพื่อส่งสินค้าให้ลูกค้าได้เลย

พิมพ์ /clear เพื่อยกเลิก`,
    });
  } else if (text === "/clear" || text === "/ยกเลิกการช่วย") {
    // Clear admin target
    if (user.isAdmin !== true) {
      return;
    }

    const currentTarget = getAdminTargetUser(user.lineUserId);
    if (currentTarget) {
      clearAdminTargetUser(user.lineUserId);
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "✅ ยกเลิกการช่วยลูกค้าแล้ว",
      });
    } else {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "ไม่มีลูกค้าที่กำลังช่วยอยู่",
      });
    }
  } else if (text === "/cancel" || text.toLowerCase() === "ยกเลิก") {
    // Cancel pending approval
    const pendingApproval = getPendingApproval(user.lineUserId);
    if (pendingApproval) {
      clearPendingApproval(user.lineUserId);
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "✅ ยกเลิกการอนุมัติสลิปเรียบร้อยแล้ว",
      });
    } else {
      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "ไม่มีรายการที่รอการอนุมัติ",
      });
    }
  } else if (text.startsWith("/") && text.length > 1) {
    // Handle short code purchase (e.g., /nf7, /นฟ7)
    const shortCode = text.substring(1).toLowerCase();

    // Check if admin has a target customer
    if (user.isAdmin === true) {
      const targetCustomer = getAdminTargetUser(user.lineUserId);
      if (targetCustomer) {
        // Send product to target customer instead (using LINE User ID)
        await handleAdminGiveByLineId(replyToken, targetCustomer.targetLineUserId, shortCode);
        return;
      }
    }

    await handleBuyCommand(replyToken, user, shortCode);
  } else if (text.length > 0 && !text.startsWith("/")) {
    // Check if this is in admin group - if yes, ignore non-command messages
    const adminGroupId = await getAdminGroupId();
    if (adminGroupId && groupId === adminGroupId) {
      return; // Silently ignore normal messages in admin group
    }

    // Check if admin has a target customer
    if (user.isAdmin === true) {
      const targetCustomer = getAdminTargetUser(user.lineUserId);
      if (targetCustomer) {
        // Send product to target customer (using LINE User ID)
        await handleAdminGiveByLineId(replyToken, targetCustomer.targetLineUserId, text.toLowerCase());
        return;
      }
    }

    // Handle short code stock check (e.g., nf7, นฟ7)
    const shortCode = text.toLowerCase();
    await handleStockCheckCommand(replyToken, shortCode);
  }
}

async function handleImageMessage(
  replyToken: string,
  message: any,
  user: any
) {
  await handleSlipVerification(replyToken, message, user);
}

async function handleHelpCommand(replyToken: string) {
  const helpText = `คำสั่งที่ใช้ได้:

💰 /bal - เช็คเครดิตคงเหลือ
📋 /history - ดูประวัติการทำรายการ
🛒 /product หรือ /สค - ดูรายการสินค้า
🛒 /ready หรือ /พส - ดูรายการพร้อมส่ง
🛍️ /buy {รหัสสินค้า} - ซื้อสินค้า
👨‍💼 /admin หรือ แอดมิน - ติดต่อแอดมิน
💵 /request-credit หรือ /สก - ขอเพิ่มเครดิต
💳 ส่งรูปสลิปโอนเงิน - เติมเงินอัตโนมัติ
❓ /help - แสดงคำสั่งนี้`;

  await lineClient.replyMessage(replyToken, {
    type: "text",
    text: helpText,
  });
}

async function handleCreditApproveCommand(
  replyToken: string,
  userId: number,
  amount: number
) {
  if (isNaN(userId) || isNaN(amount) || amount <= 0) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ รูปแบบคำสั่งไม่ถูกต้อง\nใช้: /credit-approve {user_id} {amount}",
    });
    return;
  }

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลผู้ใช้",
    });
    return;
  }

  const currentMinimumCredit = parseFloat(user.minimumCredit);
  const newMinimumCredit = currentMinimumCredit + amount;
  const balance = parseFloat(user.creditBalance);
  const oldAvailableCredit = balance + currentMinimumCredit;
  const newAvailableCredit = balance + newMinimumCredit;

  // Update user minimum credit (credit limit)
  await db
    .update(users)
    .set({
      minimumCredit: newMinimumCredit.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Notify user
  await lineClient.pushMessage(user.lineUserId, {
    type: "text",
    text: `✅ แอดมินเพิ่มวงเงินเครดิตให้คุณแล้ว!

เพิ่มวงเงิน: ${formatCurrency(amount)}
วงเงินเดิม: ${formatCurrency(currentMinimumCredit)}
วงเงินใหม่: ${formatCurrency(newMinimumCredit)}

เครดิตที่ใช้ได้เดิม: ${formatCurrency(oldAvailableCredit)}
เครดิตที่ใช้ได้ใหม่: ${formatCurrency(newAvailableCredit)}

ขอบคุณที่ใช้บริการครับ`,
  });

  // Confirm to admin
  await lineClient.replyMessage(replyToken, {
    type: "text",
    text: `✅ เพิ่มวงเงินเครดิตสำเร็จ\n\nเพิ่มวงเงินให้ ${user.displayName} จำนวน ${formatCurrency(amount)}\nวงเงินเครดิตใหม่: ${formatCurrency(newMinimumCredit)}`,
  });
}

async function handleAdminHelpCommand(replyToken: string) {
  const helpText = `📚 คำสั่งสำหรับแอดมิน:

🎯 /target {LINE_USER_ID}
   - เลือกลูกค้าที่จะช่วย (ใช้ LINE User ID)
   - ตัวอย่าง: /target U3123f451c952d28b86866578d91ff2a5
   - หลังจากนั้นพิมพ์รหัสสินค้า เช่น "nf7"
   - สินค้าจะส่งไปให้ลูกค้าที่เลือกโดยอัตโนมัติ
   - พิมพ์ /clear เพื่อยกเลิก

💵 /credit-approve {user_id} {amount}
   - เพิ่มเครดิตให้ผู้ใช้
   - ตัวอย่าง: /credit-approve 1 100

🎁 /give {user_id} {product_code}
   - ส่งสินค้าให้ผู้ใช้และหักเครดิต (ใช้ Database ID)
   - ตัวอย่าง: /give 1 nf7
   - บังคับส่งได้แม้เครดิตไม่พอ

🔧 การตั้งค่า:
   - /admin {token} ในกลุ่ม - ตั้งกลุ่มแอดมิน
   - /makemeadmin {token} - เป็นแอดมิน

📝 ฟีเจอร์อื่นๆ:
   - ใช้ปุ่มในข้อความเพื่อทำรายการรวดเร็ว
   - สลิปที่ตรวจสอบไม่ผ่านจะมีปุ่มส่งให้แอดมิน
   - คำขอเพิ่มเครดิตจะมีปุ่ม +฿100, +฿200, +฿500`;

  await lineClient.replyMessage(replyToken, {
    type: "text",
    text: helpText,
  });
}

async function processSlipApproval(
  replyToken: string,
  slipId: number,
  targetUserId: number,
  amount: number,
  adminUserId: string
) {
  // Get slip and user
  const [slip] = await db
    .select()
    .from(slips)
    .where(eq(slips.id, slipId))
    .limit(1);

  if (!slip) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลสลิป",
    });
    clearPendingApproval(adminUserId);
    return;
  }

  if (slip.status !== "pending") {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: `❌ สลิปนี้ ${slip.status === "approved" ? "อนุมัติแล้ว" : "ถูกปฏิเสธแล้ว"}`,
    });
    clearPendingApproval(adminUserId);
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!user) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลผู้ใช้",
    });
    clearPendingApproval(adminUserId);
    return;
  }

  const slipAmount = amount;
  const currentBalance = parseFloat(user.creditBalance);
  const newBalance = currentBalance + slipAmount;

  // Update slip amount if it was 0
  if (parseFloat(slip.amount) === 0) {
    await db
      .update(slips)
      .set({
        amount: slipAmount.toFixed(2),
      })
      .where(eq(slips.id, slipId));
  }

  // Update user balance
  await db
    .update(users)
    .set({
      creditBalance: newBalance.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(users.id, targetUserId));

  // Update slip status
  await db
    .update(slips)
    .set({
      status: "approved",
      verifiedAt: new Date(),
    })
    .where(eq(slips.id, slipId));

  // Create transaction record
  await db.insert(transactions).values({
    userId: user.id,
    type: "topup",
    amount: slipAmount.toFixed(2),
    beforeBalance: currentBalance.toFixed(2),
    afterBalance: newBalance.toFixed(2),
    description: `เติมเงินผ่านสลิป (อนุมัติด้วยตนเอง) - ${slip.transRef}`,
  });

  // Notify user
  await lineClient.pushMessage(user.lineUserId, {
    type: "text",
    text: `✅ สลิปของคุณได้รับการอนุมัติแล้ว!

จำนวนเงิน: ${formatCurrency(slipAmount)}
เครดิตเดิม: ${formatCurrency(currentBalance)}
เครดิตใหม่: ${formatCurrency(newBalance)}

ขอบคุณที่ใช้บริการครับ`,
  });

  // Confirm to admin
  await lineClient.replyMessage(replyToken, {
    type: "text",
    text: `✅ อนุมัติสลิปสำเร็จ\n\nเพิ่มเครดิตให้ ${user.displayName} จำนวน ${formatCurrency(slipAmount)}`,
  });

  // Clear pending approval
  clearPendingApproval(adminUserId);
}
