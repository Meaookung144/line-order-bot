import { lineClient } from "../client";
import { getAdminGroupId, setAdminGroupId } from "@/lib/settings";

export async function handleAdminCommand(
  replyToken: string,
  user: any,
  args: string
) {
  const trimmedArgs = args.trim();

  // Check if this is the setup command
  const setupToken = process.env.SET_ADMIN_GROUP_TOKEN;
  if (setupToken && trimmedArgs === setupToken) {
    // This should only work in group chats
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "✅ กลุ่มนี้ถูกตั้งเป็นกลุ่มแอดมินเรียบร้อยแล้ว",
    });
    return;
  }

  // Regular admin command - send message to admin group
  const adminGroupId = await getAdminGroupId();

  if (!adminGroupId) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ ยังไม่ได้ตั้งค่ากลุ่มแอดมิน กรุณาติดต่อผู้ดูแลระบบ",
    });
    return;
  }

  try {
    // Send notification to admin group
    const message = `📢 มีผู้ใช้ติดต่อแอดมิน

👤 ผู้ใช้: ${user.displayName}
💬 ข้อความ: ${trimmedArgs || "(ไม่มีข้อความ)"}
🆔 LINE ID: ${user.lineUserId}
💰 เครดิตคงเหลือ: ฿${parseFloat(user.creditBalance).toFixed(2)}
📊 ยอดซื้อสะสม: ฿${parseFloat(user.totalSpend).toFixed(2)}

กรุณาติดต่อกลับผู้ใช้`;

    await lineClient.pushMessage(adminGroupId, {
      type: "text",
      text: message,
    });

    // Reply to user
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "✅ ส่งข้อความถึงแอดมินเรียบร้อยแล้ว\nแอดมินจะติดต่อกลับเร็วๆ นี้",
    });
  } catch (error) {
    console.error("Error sending admin message:", error);
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ ไม่สามารถส่งข้อความถึงแอดมินได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
}

export async function handleAdminGroupSetup(groupId: string, token: string) {
  const setupToken = process.env.SET_ADMIN_GROUP_TOKEN;

  if (!setupToken) {
    throw new Error("SET_ADMIN_GROUP_TOKEN not configured");
  }

  if (token !== setupToken) {
    throw new Error("Invalid setup token");
  }

  await setAdminGroupId(groupId);
}
