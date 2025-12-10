import { lineClient } from "../client";
import { formatCurrency } from "@/lib/utils";

export async function handleBalanceCommand(replyToken: string, user: any) {
  const balance = parseFloat(user.creditBalance);
  const minimumCredit = parseFloat(user.minimumCredit);
  const availableCredit = balance - minimumCredit;

  const message = `💰 ยอดเครดิตของคุณ

เครดิตปัจจุบัน: ${formatCurrency(balance)}
วงเงินขั้นต่ำ: ${formatCurrency(minimumCredit)}
เครดิตที่ใช้ได้: ${formatCurrency(availableCredit)}

ยอดซื้อสะสม: ${formatCurrency(parseFloat(user.totalSpend))}`;

  await lineClient.replyMessage(replyToken, {
    type: "text",
    text: message,
  });
}
