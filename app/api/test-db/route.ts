import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function GET() {
  try {
    // Try to query database
    const allUsers = await db.select().from(users).limit(1);

    return NextResponse.json({
      success: true,
      message: "Database connected!",
      userCount: allUsers.length,
      hasDatabase: !!process.env.DATABASE_URL,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      hasDatabase: !!process.env.DATABASE_URL,
    }, { status: 500 });
  }
}
