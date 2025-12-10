import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stockItems, products } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/products/[id]/stock-items - List stock items for a product
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

    // Get all stock items for the product
    const items = await db
      .select()
      .from(stockItems)
      .where(eq(stockItems.productId, productId))
      .orderBy(desc(stockItems.createdAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching stock items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/products/[id]/stock-items - Add stock items to a product
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
    const { itemData, autoDuplicate } = body;

    // Validate item data
    if (!itemData || typeof itemData !== "object") {
      return NextResponse.json(
        { error: "Item data is required" },
        { status: 400 }
      );
    }

    // Get product to check retailMultiplier
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Determine how many items to create
    const multiplier = autoDuplicate ? (product.retailMultiplier || 1) : 1;

    // Create stock items
    const itemsToInsert = [];
    for (let i = 0; i < multiplier; i++) {
      itemsToInsert.push({
        productId,
        itemData,
        status: "available" as const,
      });
    }

    const createdItems = await db
      .insert(stockItems)
      .values(itemsToInsert)
      .returning();

    // Update product stock count
    const availableCount = await db
      .select()
      .from(stockItems)
      .where(
        and(
          eq(stockItems.productId, productId),
          eq(stockItems.status, "available")
        )
      );

    await db
      .update(products)
      .set({
        stock: availableCount.length,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    return NextResponse.json({
      created: createdItems.length,
      items: createdItems,
    });
  } catch (error) {
    console.error("Error creating stock items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
