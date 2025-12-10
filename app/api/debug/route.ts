import { NextResponse } from "next/server";

// TEMPORARY DEBUG ENDPOINT - DELETE AFTER FIXING
export async function GET() {
  return NextResponse.json({
    hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
    hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecretLength: process.env.LINE_CHANNEL_SECRET?.length || 0,
    channelSecretStart: process.env.LINE_CHANNEL_SECRET?.substring(0, 5) + "...",
  });
}
