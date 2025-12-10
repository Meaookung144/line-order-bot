import { lineClient } from "../client";
import { getAdminGroupId } from "@/lib/settings";
import { formatCurrency } from "@/lib/utils";

export async function handleRequestCreditCommand(
  replyToken: string,
  user: any,
  message?: string
) {
  const adminGroupId = await getAdminGroupId();

  if (!adminGroupId) {
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ ยังไม่ได้ตั้งค่ากลุ่มแอดมิน กรุณาติดต่อผู้ดูแลระบบ",
    });
    return;
  }

  try {
    // Send notification to admin group with quick action buttons
    await lineClient.pushMessage(adminGroupId, {
      type: "flex",
      altText: "📨 คำขอเพิ่มเครดิต",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📨 คำขอเพิ่มเครดิต",
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
                      text: user.displayName,
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
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "วงเงินปัจจุบัน",
                      color: "#888888",
                      size: "sm",
                      flex: 2,
                    },
                    {
                      type: "text",
                      text: formatCurrency(parseFloat(user.minimumCredit)),
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
                      text: "ยอดซื้อสะสม",
                      color: "#888888",
                      size: "sm",
                      flex: 2,
                    },
                    {
                      type: "text",
                      text: formatCurrency(parseFloat(user.totalSpend)),
                      wrap: true,
                      size: "sm",
                      flex: 3,
                    },
                  ],
                },
              ],
            },
            message
              ? {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  contents: [
                    {
                      type: "text",
                      text: "ข้อความ:",
                      size: "sm",
                      color: "#888888",
                    },
                    {
                      type: "text",
                      text: message,
                      size: "sm",
                      wrap: true,
                    },
                  ],
                }
              : ({
                  type: "filler",
                } as any),
          ].filter((c) => c.type !== "filler"),
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#06C755",
                  height: "sm",
                  action: {
                    type: "postback",
                    label: "+฿100",
                    data: JSON.stringify({
                      action: "add_credit",
                      userId: user.id,
                      lineUserId: user.lineUserId,
                      amount: 100,
                      displayName: user.displayName,
                    }),
                    displayText: `เพิ่มเครดิต ฿100 ให้ ${user.displayName}`,
                  },
                },
                {
                  type: "button",
                  style: "primary",
                  color: "#06C755",
                  height: "sm",
                  action: {
                    type: "postback",
                    label: "+฿200",
                    data: JSON.stringify({
                      action: "add_credit",
                      userId: user.id,
                      lineUserId: user.lineUserId,
                      amount: 200,
                      displayName: user.displayName,
                    }),
                    displayText: `เพิ่มเครดิต ฿200 ให้ ${user.displayName}`,
                  },
                },
                {
                  type: "button",
                  style: "primary",
                  color: "#06C755",
                  height: "sm",
                  action: {
                    type: "postback",
                    label: "+฿500",
                    data: JSON.stringify({
                      action: "add_credit",
                      userId: user.id,
                      lineUserId: user.lineUserId,
                      amount: 500,
                      displayName: user.displayName,
                    }),
                    displayText: `เพิ่มเครดิต ฿500 ให้ ${user.displayName}`,
                  },
                },
              ],
            },
            {
              type: "text",
              text: `หรือพิมพ์: /credit-approve ${user.id} {จำนวนเงิน}`,
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

    // Reply to user
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "✅ ส่งคำขอเพิ่มเครดิตไปยังแอดมินเรียบร้อยแล้ว\nกรุณารอการตอบกลับจากแอดมิน",
    });
  } catch (error) {
    console.error("Error sending credit request:", error);
    await lineClient.replyMessage(replyToken, {
      type: "text",
      text: "❌ ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
}
