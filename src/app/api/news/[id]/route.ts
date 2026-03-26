import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const snapshot = await adminDb.collection("news").doc(id).get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "News not found" },
        { status: 404 }
      );
    }

    const data = snapshot.data();
    const createdAt = data?.createdAt;

    return NextResponse.json({
      id: snapshot.id,
      ...data,
      createdAt:
        typeof createdAt?.toMillis === "function"
          ? createdAt.toMillis()
          : null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to fetch news item",
        message,
      },
      { status: 500 }
    );
  }
}
