import { NextResponse } from "next/server";
import { CustomChannel } from "@/lib/channelStorage";

// No default channels - starts empty, user creates their own
const getStore = () => {
  const globalStore = globalThis as typeof globalThis & { __customChannels?: CustomChannel[] };
  if (!globalStore.__customChannels) {
    globalStore.__customChannels = [];
  }
  return globalStore.__customChannels;
};

export async function GET() {
  const channels = getStore();
  return NextResponse.json({ channels });
}

export async function POST(request: Request) {
  const body = await request.json();
  const channels = getStore();

  const newChannel: CustomChannel = {
    id: body.id,
    name: body.name,
    emoji: body.emoji,
    filter: body.filter,
    createdAt: body.createdAt ?? new Date().toISOString().slice(0, 10),
  };

  if (!channels.find((channel) => channel.id === newChannel.id)) {
    channels.push(newChannel);
  }

  return NextResponse.json({ channels });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const channels = getStore();
  const filtered = channels.filter((channel) => channel.id !== id);
  const globalStore = globalThis as typeof globalThis & { __customChannels?: CustomChannel[] };
  globalStore.__customChannels = filtered;

  return NextResponse.json({ channels: filtered });
}
