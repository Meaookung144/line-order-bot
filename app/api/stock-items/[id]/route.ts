import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stockItems, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PUT /api/stock-items/[id] - Update a stock item
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const itemId = parseInt(params.id);
    const body = await req.json();
    const { itemData, status } = body;

    const updateData: any = {};

    if (itemData) {
      updateData.itemData = itemData;
    }

    if (status) {
      updateData.status = status;
    }

    const [updatedItem] = await db
      .update(stockItems)
      .set(updateData)
      .where(eq(stockItems.id, itemId))
      .returning();

    if (!updatedItem) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating stock item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/stock-items/[id] - Delete a stock item
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const itemId = parseInt(params.id);

    // Get the stock item to find its product
    const [item] = await db
      .select()
      .from(stockItems)
      .where(eq(stockItems.id, itemId))
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    const productId = item.productId;

    // Delete the stock item
    await db.delete(stockItems).where(eq(stockItems.id, itemId));

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stock item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
