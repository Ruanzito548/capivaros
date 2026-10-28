import { NextResponse } from "next/server";
import { listRaidCores } from "@/lib/raid-cores-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ cores: await listRaidCores() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load cores", message },
      { status: 500 }
    );
  }
}
