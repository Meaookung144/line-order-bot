import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { slips, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingSlips = await db
      .select({
        slip: slips,
        user: {
          displayName: users.displayName,
          lineUserId: users.lineUserId,
        },
      })
      .from(slips)
      .leftJoin(users, eq(slips.userId, users.id))
      .where(eq(slips.status, "pending"))
      .orderBy(desc(slips.createdAt));

    const result = pendingSlips.map((record) => ({
      ...record.slip,
      user: record.user,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching pending slips:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
