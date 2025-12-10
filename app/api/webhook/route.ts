import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent, validateSignature } from "@line/bot-sdk";
import { handleMessage } from "@/lib/line/handlers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!signature) {
      console.error("❌ No LINE signature header found");
      return NextResponse.json(
        { error: "No signature" },
        { status: 401 }
      );
    }

    // Validate signature
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelSecret) {
      console.error("❌ LINE_CHANNEL_SECRET not set in environment");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const isValid = validateSignature(body, channelSecret, signature);

    if (!isValid) {
      console.error("❌ Invalid LINE signature");
      console.error("Channel Secret (first 10 chars):", channelSecret.substring(0, 10) + "...");
      console.error("Signature received:", signature.substring(0, 20) + "...");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    console.log("✅ LINE signature validated successfully");

    const data = JSON.parse(body);
    const events: WebhookEvent[] = data.events;

    console.log("📦 Webhook body:", JSON.stringify(data, null, 2));
    console.log("📦 Number of events:", events.length);

    // Process events
    await Promise.all(
      events.map(async (event) => {
        console.log("📦 Event object:", JSON.stringify(event, null, 2));
        if (event.type === "message") {
          await handleMessage(event);
        }
        // Add other event types as needed
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "LINE Webhook Endpoint" });
}
