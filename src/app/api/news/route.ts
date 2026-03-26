import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function serializeNews(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data();
  const createdAt = data.createdAt;

  return {
    id: doc.id,
    ...data,
    createdAt:
      typeof createdAt?.toMillis === "function" ? createdAt.toMillis() : null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const requestedLimit = limitParam ? Number(limitParam) : 3;
  const newsLimit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? requestedLimit
    : 3;

  try {
    const snapshot = await adminDb
      .collection("news")
      .orderBy("createdAt", "desc")
      .limit(newsLimit)
      .get();

    const news = snapshot.docs.map(serializeNews);

    return NextResponse.json(news);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to fetch news",
        message,
      },
      { status: 500 }
    );
  }
}
