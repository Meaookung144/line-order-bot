import { Client, ClientConfig } from "@line/bot-sdk";

if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  throw new Error("LINE_CHANNEL_ACCESS_TOKEN is required");
}

if (!process.env.LINE_CHANNEL_SECRET) {
  throw new Error("LINE_CHANNEL_SECRET is required");
}

const config: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

export const lineClient = new Client(config);
