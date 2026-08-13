import { NextResponse } from "next/server";
import { getRecommendations } from "@/lib/ai/recommendations";

export async function POST(req: Request) {
  const { portfolioSummary } = (await req.json()) as { portfolioSummary: string };
  const result = await getRecommendations(portfolioSummary);
  return NextResponse.json(result);
}
