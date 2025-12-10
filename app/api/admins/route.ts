import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allAdmins = await db
      .select({
        id: admins.id,
        email: admins.email,
        name: admins.name,
        createdAt: admins.createdAt,
      })
      .from(admins)
      .orderBy(desc(admins.createdAt));

    return NextResponse.json(allAdmins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    const [newAdmin] = await db
      .insert(admins)
      .values({
        email,
        passwordHash,
        name,
      })
      .returning({
        id: admins.id,
        email: admins.email,
        name: admins.name,
        createdAt: admins.createdAt,
      });

    return NextResponse.json(newAdmin);
  } catch (error: any) {
    console.error("Error creating admin:", error);

    // Check for unique constraint violation
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
