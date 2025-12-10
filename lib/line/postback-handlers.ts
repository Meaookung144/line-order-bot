import { PostbackEvent } from "@line/bot-sdk";
import { lineClient } from "./client";
import { db } from "@/lib/db";
import { slips, users, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAdminGroupId } from "@/lib/settings";
import { formatCurrency } from "@/lib/utils";
import { verifySlip } from "@/lib/slipverify/client";
import { setPendingApproval } from "./approval-state";

export async function handlePostback(event: PostbackEvent) {
  const { replyToken, source, postback } = event;
  const userId = source.userId;
  const groupId = source.type === "group" ? source.groupId : null;

  if (!userId) {
    console.log("⚠️ No user ID in postback event");
    return;
  }

  try {
    const data = JSON.parse(postback.data);
    const action = data.action;

    console.log("📲 Postback action:", action);
    console.log("📲 Postback data:", data);

    // Check if admin action is from admin group
    const adminActions = ["approve_slip", "reject_slip", "add_credit"];
    if (adminActions.includes(action)) {
      const adminGroupId = await getAdminGroupId();
      if (!adminGroupId || groupId !== adminGroupId) {
        return; // Silently ignore if not from admin group
      }
    }

    switch (action) {
      case "request_manual_approval":
        await handleManualApprovalRequest(event, data);
        break;
      case "approve_slip":
        await handleAdminApproveSlip(event, data);
        break;
      case "reject_slip":
        await handleAdminRejectSlip(event, data);
        break;
      case "add_credit":
        await handleAddCredit(event, data);
        break;
      case "request_slip_help":
        await handleRequestSlipHelp(event, data);
        break;
      default:
        console.log("Unknown postback action:", action);
    }
  } catch (error) {
    console.error("Error handling postback:", error);
  }
}

async function handleManualApprovalRequest(event: PostbackEvent, data: any) {
  const userId = event.source.userId;
  if (!userId) return;

  // Get user info
  const profile = await lineClient.getProfile(userId);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.lineUserId, userId))
    .limit(1);

  if (!user) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลผู้ใช้",
    });
    return;
  }

  // Verify slip again to get amount
  let amount = 0;
  let slipInfo = {
    sender: "ไม่ทราบ",
    receiver: "ไม่ทราบ",
    transDate: "ไม่ทราบ",
    transTime: "ไม่ทราบ",
    transRef: `manual_${Date.now()}`,
  };

  try {
    const slipData = await verifySlip(data.slipPayload);
    if (slipData.data) {
      amount = slipData.data.amount;
      const date = new Date(slipData.data.dateTime);
      slipInfo = {
        sender: slipData.data.sender.account.name,
        receiver: slipData.data.receiver.account.name,
        transDate: date.toISOString().split('T')[0],
        transTime: date.toTimeString().split(' ')[0],
        transRef: slipData.data.transRef,
      };
    }
  } catch (error) {
    console.error("Error re-verifying slip:", error);
  }

  // Create pending slip record
  const [slip] = await db
    .insert(slips)
    .values({
      userId: user.id,
      slipPayload: data.slipPayload,
      transRef: slipInfo.transRef,
      amount: amount.toString(),
      senderName: slipInfo.sender,
      receiverName: slipInfo.receiver,
      sendingBank: "ไม่ทราบ",
      receivingBank: "ไม่ทราบ",
      transDate: slipInfo.transDate,
      transTime: slipInfo.transTime,
      status: "pending",
      r2Url: data.r2Url || null,
      verificationResponse: JSON.stringify({
        manual: true,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
      }),
    })
    .returning();

  // Send to admin group
  const adminGroupId = await getAdminGroupId();

  if (!adminGroupId) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ ยังไม่ได้ตั้งค่ากลุ่มแอดมิน กรุณาติดต่อผู้ดูแลระบบ",
    });
    return;
  }

  // Send flex message to admin group
  await lineClient.pushMessage(adminGroupId, {
    type: "flex",
    altText: "📥 สลิปรอการอนุมัติ",
    contents: {
      type: "bubble",
      hero: data.r2Url
        ? {
            type: "image",
            url: data.r2Url,
            size: "full",
            aspectRatio: "3:4",
            aspectMode: "cover",
          }
        : undefined,
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📥 สลิปรอการอนุมัติ",
            weight: "bold",
            size: "lg",
            color: "#FFA500",
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
                    text: "ผู้ใช้",
                    color: "#888888",
                    size: "sm",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: profile.displayName,
                    wrap: true,
                    size: "sm",
                    flex: 3,
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
                    text: "จำนวนเงิน",
                    color: "#888888",
                    size: "sm",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: amount > 0 ? formatCurrency(amount) : "ไม่ทราบ",
                    wrap: true,
                    size: "md",
                    weight: "bold",
                    color: "#06C755",
                    flex: 3,
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
                    text: "สาเหตุ",
                    color: "#888888",
                    size: "sm",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: data.errorMessage || "ระบบตรวจสอบไม่ผ่าน",
                    wrap: true,
                    size: "sm",
                    color: "#E53E3E",
                    flex: 3,
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
                    text: "ผู้ส่ง",
                    color: "#888888",
                    size: "sm",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: slipInfo.sender,
                    wrap: true,
                    size: "sm",
                    flex: 3,
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
                    text: "เครดิตปัจจุบัน",
                    color: "#888888",
                    size: "sm",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: formatCurrency(parseFloat(user.creditBalance)),
                    wrap: true,
                    size: "sm",
                    flex: 3,
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
            color: "#06C755",
            action: {
              type: "postback",
              label: "✅ อนุมัติ",
              data: JSON.stringify({
                action: "approve_slip",
                slipId: slip.id,
                userId: user.id,
                amount,
              }),
              displayText: "อนุมัติสลิป",
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "❌ ปฏิเสธ (Slip ID: " + slip.id + ")",
              data: JSON.stringify({
                action: "reject_slip",
                slipId: slip.id,
                userId: user.id,
                lineUserId: user.lineUserId,
              }),
              displayText: `ปฏิเสธสลิป #${slip.id}`,
            },
          },
        ],
      },
    },
  });

  // Confirm to user
  await lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: "✅ ส่งสลิปให้แอดมินตรวจสอบเรียบร้อยแล้ว\nกรุณารอการอนุมัติจากแอดมิน",
  });
}

async function handleAdminApproveSlip(event: PostbackEvent, data: any) {
  const { slipId, userId } = data;
  const adminUserId = event.source.userId;

  if (!adminUserId) {
    return;
  }

  // Get slip and user
  const [slip] = await db
    .select()
    .from(slips)
    .where(eq(slips.id, slipId))
    .limit(1);

  if (!slip) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลสลิป",
    });
    return;
  }

  if (slip.status !== "pending") {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: `❌ สลิปนี้ ${slip.status === "approved" ? "อนุมัติแล้ว" : "ถูกปฏิเสธแล้ว"}`,
    });
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลผู้ใช้",
    });
    return;
  }

  // Set pending approval state
  setPendingApproval(adminUserId, slipId, userId);

  // Ask for amount
  const slipAmount = parseFloat(slip.amount);
  const amountInfo = slipAmount > 0
    ? `\n\n💡 จำนวนเงินในสลิป: ${formatCurrency(slipAmount)}\n(พิมพ์จำนวนเงินเพื่อยืนยัน หรือพิมพ์จำนวนอื่นเพื่อแก้ไข)`
    : '\n\n💡 กรุณาระบุจำนวนเงินที่ถูกต้อง';

  await lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: `📝 กรุณาพิมพ์จำนวนเงินที่ต้องการอนุมัติ\n\nผู้ใช้: ${user.displayName}\nSlip ID: ${slipId}${amountInfo}`,
  });
}

async function handleAdminRejectSlip(event: PostbackEvent, data: any) {
  const { slipId, lineUserId } = data;

  // Get slip
  const [slip] = await db
    .select()
    .from(slips)
    .where(eq(slips.id, slipId))
    .limit(1);

  if (!slip) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลสลิป",
    });
    return;
  }

  if (slip.status !== "pending") {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: `❌ สลิปนี้ ${slip.status === "approved" ? "อนุมัติแล้ว" : "ถูกปฏิเสธแล้ว"}`,
    });
    return;
  }

  // Update slip status
  await db
    .update(slips)
    .set({
      status: "rejected",
      rejectionReason: "แอดมินปฏิเสธสลิป",
    })
    .where(eq(slips.id, slipId));

  // Notify user
  await lineClient.pushMessage(lineUserId, {
    type: "text",
    text: "❌ สลิปของคุณไม่ได้รับการอนุมัติ\n\nกรุณาตรวจสอบสลิปและส่งใหม่อีกครั้ง หรือติดต่อแอดมินเพื่อสอบถามเพิ่มเติม",
  });

  // Confirm to admin
  await lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: "✅ ปฏิเสธสลิปเรียบร้อยแล้ว",
  });
}

async function handleAddCredit(event: PostbackEvent, data: any) {
  const { userId, lineUserId, amount, displayName } = data;

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลผู้ใช้",
    });
    return;
  }

  const creditAmount = parseFloat(amount.toString());
  const currentMinimumCredit = parseFloat(user.minimumCredit);
  const newMinimumCredit = currentMinimumCredit + creditAmount;
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
  await lineClient.pushMessage(lineUserId, {
    type: "text",
    text: `✅ แอดมินเพิ่มวงเงินเครดิตให้คุณแล้ว!

เพิ่มวงเงิน: ${formatCurrency(creditAmount)}
วงเงินเดิม: ${formatCurrency(currentMinimumCredit)}
วงเงินใหม่: ${formatCurrency(newMinimumCredit)}

เครดิตที่ใช้ได้เดิม: ${formatCurrency(oldAvailableCredit)}
เครดิตที่ใช้ได้ใหม่: ${formatCurrency(newAvailableCredit)}

ขอบคุณที่ใช้บริการครับ`,
  });

  // Confirm to admin
  await lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: `✅ เพิ่มวงเงินเครดิตสำเร็จ\n\nเพิ่มวงเงินให้ ${displayName} จำนวน ${formatCurrency(creditAmount)}\nวงเงินเครดิตใหม่: ${formatCurrency(newMinimumCredit)}`,
  });
}

async function handleRequestSlipHelp(event: PostbackEvent, data: any) {
  const { userId, displayName, r2Url, errorMessage } = data;

  // Get admin group ID
  const adminGroupId = await getAdminGroupId();

  if (!adminGroupId) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ ยังไม่ได้ตั้งค่ากลุ่มแอดมิน กรุณาติดต่อผู้ดูแลระบบ",
    });
    return;
  }

  // Get user info
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ ไม่พบข้อมูลผู้ใช้",
    });
    return;
  }

  // Create pending slip record
  const [slip] = await db
    .insert(slips)
    .values({
      userId: user.id,
      slipPayload: "",
      transRef: `error_${Date.now()}`,
      amount: "0",
      senderName: "ไม่ทราบ",
      receiverName: "ไม่ทราบ",
      sendingBank: "ไม่ทราบ",
      receivingBank: "ไม่ทราบ",
      transDate: new Date().toISOString().split('T')[0],
      transTime: new Date().toTimeString().split(' ')[0],
      status: "pending",
      r2Url: r2Url || null,
      verificationResponse: JSON.stringify({
        error: true,
        errorMessage: errorMessage || "เกิดข้อผิดพลาดในการตรวจสอบ",
        requestedAt: new Date().toISOString(),
      }),
    })
    .returning();

  // Send notification to admin group with approval buttons
  await lineClient.pushMessage(adminGroupId, {
    type: "flex",
    altText: "🆘 สลิปรอการตรวจสอบ (เกิดข้อผิดพลาด)",
    contents: {
      type: "bubble",
      hero: r2Url
        ? {
            type: "image",
            url: r2Url,
            size: "full",
            aspectRatio: "3:4",
            aspectMode: "cover",
          }
        : undefined,
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🆘 สลิปรอการตรวจสอบ",
            weight: "bold",
            size: "lg",
            color: "#FFA500",
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
                    text: "ผู้ใช้",
                    color: "#888888",
                    size: "sm",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: displayName,
                    wrap: true,
                    size: "sm",
                    weight: "bold",
                    flex: 3,
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
                    text: "เครดิตปัจจุบัน",
                    color: "#888888",
                    size: "sm",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: formatCurrency(parseFloat(user.creditBalance)),
                    wrap: true,
                    size: "sm",
                    flex: 3,
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                contents: [
                  {
                    type: "text",
                    text: "สาเหตุ:",
                    size: "sm",
                    color: "#888888",
                  },
                  {
                    type: "text",
                    text: errorMessage || "เกิดข้อผิดพลาดในการตรวจสอบ",
                    size: "sm",
                    wrap: true,
                    color: "#E53E3E",
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  {
                    type: "text",
                    text: "💡 วิธีการอนุมัติ:",
                    size: "xs",
                    color: "#888888",
                    weight: "bold",
                  },
                  {
                    type: "text",
                    text: "1. เข้าเว็บไซต์เพื่อดูสลิป",
                    size: "xs",
                    color: "#888888",
                  },
                  {
                    type: "text",
                    text: "2. กรอกจำนวนเงินที่ถูกต้อง",
                    size: "xs",
                    color: "#888888",
                  },
                  {
                    type: "text",
                    text: "3. กดอนุมัติในเว็บหรือ LINE",
                    size: "xs",
                    color: "#888888",
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
            color: "#06C755",
            action: {
              type: "postback",
              label: "✅ อนุมัติ (Slip ID: " + slip.id + ")",
              data: JSON.stringify({
                action: "approve_slip",
                slipId: slip.id,
                userId: user.id,
              }),
              displayText: `อนุมัติสลิป #${slip.id}`,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "❌ ปฏิเสธ (Slip ID: " + slip.id + ")",
              data: JSON.stringify({
                action: "reject_slip",
                slipId: slip.id,
                userId: user.id,
                lineUserId: user.lineUserId,
              }),
              displayText: `ปฏิเสธสลิป #${slip.id}`,
            },
          },
          {
            type: "text",
            text: `หรือดูในเว็บไซต์ (Slip ID: ${slip.id})`,
            size: "xs",
            color: "#888888",
            align: "center",
            wrap: true,
            margin: "sm",
          },
        ],
      },
    },
  });

  // Confirm to user
  await lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: "✅ ส่งสลิปให้แอดมินตรวจสอบเรียบร้อยแล้ว\nกรุณารอการอนุมัติจากแอดมิน",
  });
}

