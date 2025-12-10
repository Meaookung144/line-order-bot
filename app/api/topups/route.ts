import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, slips, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/topups - Get all topup transactions with slip images
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get topup transactions with associated slip data
    const topups = await db
      .select({
        transaction: transactions,
        slip: slips,
        user: {
          id: users.id,
          displayName: users.displayName,
          lineUserId: users.lineUserId,
        },
      })
      .from(transactions)
      .leftJoin(slips, eq(slips.transRef, transactions.description))
      .leftJoin(users, eq(users.id, transactions.userId))
      .where(eq(transactions.type, "topup"))
      .orderBy(desc(transactions.createdAt))
      .limit(100);

    // Transform the data to include slip information
    const topupData = topups.map((record) => {
      // Try to find the matching slip by finding the slip that was created around the same time
      return {
        id: record.transaction.id,
        userId: record.transaction.userId,
        amount: record.transaction.amount,
        beforeBalance: record.transaction.beforeBalance,
        afterBalance: record.transaction.afterBalance,
        description: record.transaction.description,
        createdAt: record.transaction.createdAt,
        user: record.user,
        slip: record.slip
          ? {
              id: record.slip.id,
              transRef: record.slip.transRef,
              senderName: record.slip.senderName,
              receiverName: record.slip.receiverName,
              sendingBank: record.slip.sendingBank,
              receivingBank: record.slip.receivingBank,
              transDate: record.slip.transDate,
              transTime: record.slip.transTime,
              status: record.slip.status,
              r2Url: record.slip.r2Url,
            }
          : null,
      };
    });

    // Also get slips that might not have matching transactions yet
    const allSlips = await db
      .select({
        slip: slips,
        user: {
          id: users.id,
          displayName: users.displayName,
          lineUserId: users.lineUserId,
        },
      })
      .from(slips)
      .leftJoin(users, eq(users.id, slips.userId))
      .where(eq(slips.status, "approved"))
      .orderBy(desc(slips.createdAt))
      .limit(100);

    // Merge with existing topup data
    const slipData = allSlips.map((record) => {
      const existingTopup = topupData.find(
        (t) => t.slip?.transRef === record.slip.transRef
      );
      if (existingTopup) return null; // Skip if already included

      return {
        id: record.slip.id,
        userId: record.slip.userId,
        amount: record.slip.amount,
        beforeBalance: null,
        afterBalance: null,
        description: `Topup via slip ${record.slip.transRef}`,
        createdAt: record.slip.createdAt,
        user: record.user,
        slip: {
          id: record.slip.id,
          transRef: record.slip.transRef,
          senderName: record.slip.senderName,
          receiverName: record.slip.receiverName,
          sendingBank: record.slip.sendingBank,
          receivingBank: record.slip.receivingBank,
          transDate: record.slip.transDate,
          transTime: record.slip.transTime,
          status: record.slip.status,
          r2Url: record.slip.r2Url,
        },
      };
    });

    const combinedData = [
      ...topupData,
      ...slipData.filter((s) => s !== null),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(combinedData);
  } catch (error) {
    console.error("Error fetching topups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
