import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { productShortCodes, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/products/[id]/short-codes - List short codes for a product
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = parseInt(params.id);

    const codes = await db
      .select()
      .from(productShortCodes)
      .where(eq(productShortCodes.productId, productId));

    return NextResponse.json(codes);
  } catch (error) {
    console.error("Error fetching short codes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/products/[id]/short-codes - Add a short code to a product
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = parseInt(params.id);
    const body = await req.json();
    const { code } = body;

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: "Short code is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if short code already exists
    const [existingCode] = await db
      .select()
      .from(productShortCodes)
      .where(eq(productShortCodes.code, code.trim().toLowerCase()))
      .limit(1);

    if (existingCode) {
      return NextResponse.json(
        { error: "Short code already exists" },
        { status: 400 }
      );
    }

    const [newCode] = await db
      .insert(productShortCodes)
      .values({
        productId,
        code: code.trim().toLowerCase(),
      })
      .returning();

    return NextResponse.json(newCode);
  } catch (error) {
    console.error("Error creating short code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id]/short-codes - Delete a short code
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = parseInt(params.id);
    const { searchParams } = new URL(req.url);
    const codeId = searchParams.get("codeId");

    if (!codeId) {
      return NextResponse.json(
        { error: "Code ID is required" },
        { status: 400 }
      );
    }

    await db
      .delete(productShortCodes)
      .where(
        and(
          eq(productShortCodes.id, parseInt(codeId)),
          eq(productShortCodes.productId, productId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting short code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
