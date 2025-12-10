import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/users/[id]/minimum-credit - Update user's minimum credit
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(params.id);
    const { minimumCredit } = await req.json();

    if (minimumCredit === undefined || minimumCredit < 0) {
      return NextResponse.json(
        { error: "Invalid minimum credit value" },
        { status: 400 }
      );
    }

    // Update minimum credit
    await db
      .update(users)
      .set({
        minimumCredit: minimumCredit.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating minimum credit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
