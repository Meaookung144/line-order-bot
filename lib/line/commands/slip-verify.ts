import { ImageMessage } from "@line/bot-sdk";
import { lineClient } from "../client";
import { db } from "@/lib/db";
import { slips, users, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { extractQRFromImage } from "@/lib/slipverify/qr-extract";
import { verifySlip } from "@/lib/slipverify/client";
import { uploadSlipImage } from "@/lib/r2/client";
import { formatCurrency } from "@/lib/utils";
import axios from "axios";

export async function handleSlipVerification(
  replyToken: string,
  message: ImageMessage,
  user: any
) {
  try {
    // Show loading animation while processing slip (max 60 seconds)
    try {
      await axios.post(
        "https://api.line.me/v2/bot/chat/loading/start",
        {
          chatId: user.lineUserId,
          loadingSeconds: 60,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (loadingError) {
      console.log("Could not show loading animation:", loadingError);
      // Continue even if loading animation fails
    }

    // Download image from LINE
    const stream = await lineClient.getMessageContent((message as any).id);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const imageBuffer = Buffer.concat(chunks);

    // Extract QR code
    const qrPayload = await extractQRFromImage(imageBuffer);

    if (!qrPayload) {
      await lineClient.pushMessage(user.lineUserId, {
        type: "text",
        text: "❌ ไม่พบ QR Code ในรูปภาพ\nกรุณาถ่ายภาพสลิปให้ชัดและมี QR Code อยู่ในภาพ",
      });
      return;
    }

    // Verify slip with Slip2Go API
    console.log("🔍 QR Code extracted:", qrPayload);

    const slipData = await verifySlip(qrPayload);

    console.log("📋 Slip verification response:", JSON.stringify(slipData, null, 2));
    console.log("📋 Code:", slipData.code);
    console.log("📋 Message:", slipData.message);
    console.log("📋 Has data:", !!slipData.data);

    // Check if slip is valid
    // Valid codes: 200000 (Slip Found), 200001 (Get Info Success), 200200 (Slip is Valid)
    const validCodes = ["200000", "200001", "200200"];
    const isValidSlip = validCodes.includes(slipData.code);

    if (!isValidSlip || !slipData.data) {
      console.error("❌ Slip verification failed");
      console.error("Full response:", JSON.stringify(slipData, null, 2));

      // Map error codes to Thai messages
      let errorMessage = "";
      switch (slipData.code) {
        case "200401":
          errorMessage = "❌ บัญชีผู้รับไม่ถูกต้อง";
          break;
        case "200402":
          errorMessage = "❌ ยอดโอนเงินไม่ตรงเงื่อนไข";
          break;
        case "200403":
          errorMessage = "❌ วันที่โอนไม่ตรงเงื่อนไข";
          break;
        case "200404":
          errorMessage = "❌ ไม่พบข้อมูลสลิปในระบบธนาคาร";
          break;
        case "200500":
          errorMessage = "❌ สลิปเสีย/สลิปปลอม";
          break;
        case "200501":
          errorMessage = "❌ สลิปซ้ำ - สลิปนี้เคยถูกใช้งานแล้ว";
          break;
        default:
          errorMessage = `❌ สลิปไม่ถูกต้องหรือไม่สามารถตรวจสอบได้\n\nรายละเอียด: ${slipData.message || 'Unknown error'}`;
      }

      await lineClient.pushMessage(user.lineUserId, {
        type: "text",
        text: errorMessage,
      });
      return;
    }

    const { transRef, receiver, amount, sender, dateTime } = slipData.data;

    // Parse date and time from ISO format
    const date = new Date(dateTime);
    const transDate = date.toISOString().split('T')[0];
    const transTime = date.toTimeString().split(' ')[0];

    const sendingBank = sender.bank.name;
    const receivingBank = receiver.bank.name;

    // Check if slip already used in database (ALWAYS check, even in simple mode)
    const [existingSlip] = await db
      .select()
      .from(slips)
      .where(eq(slips.transRef, transRef))
      .limit(1);

    if (existingSlip) {
      await lineClient.pushMessage(user.lineUserId, {
        type: "text",
        text: "❌ สลิปนี้ถูกใช้ไปแล้ว",
      });
      return;
    }

    // Upload to R2
    let r2Url = "";
    try {
      r2Url = await uploadSlipImage(imageBuffer, transRef);
    } catch (error) {
      console.error("Error uploading to R2:", error);
      // Continue even if R2 upload fails
    }

    // Check if CREDITMODE is enabled
    const creditMode = process.env.CREDITMODE !== "false";

    if (!creditMode) {
      // Simple slip verification mode - Mark slip as used and return amount
      // Save slip to database to prevent reuse
      await db.insert(slips).values({
        userId: user.id,
        slipPayload: qrPayload,
        transRef,
        amount: amount.toString(),
        senderName: sender.account.name,
        receiverName: receiver.account.name,
        sendingBank,
        receivingBank,
        transDate,
        transTime,
        status: "approved",
        r2Url,
        verificationResponse: JSON.stringify(slipData),
        verifiedAt: new Date(),
      });

      // Send verification result with Flex Message
      await lineClient.pushMessage(user.lineUserId, {
        type: "flex",
        altText: "✅ ยืนยันสลิป!",
        contents: {
          type: "bubble",
          size: "kilo",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "✅ ยืนยันสลิป!",
                weight: "bold",
                size: "lg",
                color: "#06C755",
                margin: "none",
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
                        text: "จำนวนเงิน",
                        color: "#aaaaaa",
                        size: "sm",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: formatCurrency(amount),
                        wrap: true,
                        color: "#06C755",
                        size: "md",
                        weight: "bold",
                        flex: 3,
                        align: "end",
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
                        text: "วันที่-เวลา",
                        color: "#aaaaaa",
                        size: "sm",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: new Date(dateTime).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }),
                        wrap: true,
                        color: "#666666",
                        size: "sm",
                        flex: 3,
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
            spacing: "none",
            contents: [
              {
                type: "text",
                text: "Made with ❤️ by Pranakorn Group",
                color: "#006ba9ff",
                size: "xxs",
                align: "center",
                action: {
                  type: "uri",
                  label: "Visit Pranakorn Group",
                  uri: "https://pranakorn.dev",
                },
              },
            ],
          },
        },
      });
      return;
    }

    // Credit mode enabled - full credit management with database
    // Auto-approve and add credit
    const currentBalance = parseFloat(user.creditBalance);
    const newBalance = currentBalance + amount;

    // Update user balance
    await db
      .update(users)
      .set({
        creditBalance: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create slip record
    await db.insert(slips).values({
      userId: user.id,
      slipPayload: qrPayload,
      transRef,
      amount: amount.toString(),
      senderName: sender.account.name,
      receiverName: receiver.account.name,
      sendingBank,
      receivingBank,
      transDate,
      transTime,
      status: "approved",
      r2Url,
      verificationResponse: JSON.stringify(slipData),
      verifiedAt: new Date(),
    });

    // Create transaction record
    await db.insert(transactions).values({
      userId: user.id,
      type: "topup",
      amount: amount.toString(),
      beforeBalance: currentBalance.toFixed(2),
      afterBalance: newBalance.toFixed(2),
      description: `เติมเงินผ่านสลิป - ${transRef}`,
    });

    // Send success message
    await lineClient.pushMessage(user.lineUserId, {
      type: "text",
      text: `✅ เติมเงินสำเร็จ!

จำนวนเงิน: ${formatCurrency(amount)}
เครดิตเดิม: ${formatCurrency(currentBalance)}
เครดิตใหม่: ${formatCurrency(newBalance)}

ขอบคุณที่ใช้บริการครับ`,
    });
  } catch (error) {
    console.error("Error verifying slip:", error);
    await lineClient.pushMessage(user.lineUserId, {
      type: "text",
      text: "❌ เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่อีกครั้งหรือติดต่อแอดมิน",
    });
  }
}
