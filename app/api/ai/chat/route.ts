import { NextResponse } from "next/server";
import { getChatReply } from "@/lib/ai/chat";

export async function POST(req: Request) {
  const { question, context } = (await req.json()) as { question: string; context: string };
  const reply = await getChatReply(question, context);
  return NextResponse.json({ reply });
}
