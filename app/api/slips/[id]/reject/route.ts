import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { slips, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { lineClient } from "@/lib/line/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reason } = body;

    const slipId = parseInt(params.id);
    if (isNaN(slipId)) {
      return NextResponse.json({ error: "Invalid slip ID" }, { status: 400 });
    }

    // Get slip
    const [slip] = await db
      .select()
      .from(slips)
      .where(eq(slips.id, slipId))
      .limit(1);

    if (!slip) {
      return NextResponse.json({ error: "Slip not found" }, { status: 404 });
    }

    if (slip.status !== "pending") {
      return NextResponse.json(
        { error: "Slip already processed" },
        { status: 400 }
      );
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, slip.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update slip status
    await db
      .update(slips)
      .set({
        status: "rejected",
        rejectionReason: reason || "ไม่ระบุเหตุผล",
        verifiedAt: new Date(),
        approvedBy: parseInt(session.user.id),
      })
      .where(eq(slips.id, slipId));

    // Notify user via LINE
    try {
      await lineClient.pushMessage(user.lineUserId, {
        type: "text",
        text: `❌ สลิปของคุณถูกปฏิเสธ

เหตุผล: ${reason || "ไม่ระบุเหตุผล"}

กรุณาตรวจสอบและส่งสลิปใหม่อีกครั้ง หรือติดต่อแอดมิน`,
      });
    } catch (error) {
      console.error("Error sending LINE notification:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error rejecting slip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
