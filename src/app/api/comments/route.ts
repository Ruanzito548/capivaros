import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return null;
  }

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const newsId = request.nextUrl.searchParams.get("newsId");

  if (!newsId) {
    return NextResponse.json(
      { error: "newsId is required" },
      { status: 400 }
    );
  }

  try {
    const snapshot = await adminDb
      .collection("comments")
      .where("newsId", "==", newsId)
      .orderBy("createdAt", "desc")
      .get();

    const comments = snapshot.docs.map((commentDoc) => {
      const data = commentDoc.data();

      return {
        id: commentDoc.id,
        user: data.user ?? "",
        userId: data.userId ?? null,
        content: data.content ?? "",
      };
    });

    return NextResponse.json(comments);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to fetch comments",
        message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const newsId =
      typeof body.newsId === "string" ? body.newsId.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!newsId || !content) {
      return NextResponse.json(
        { error: "newsId and content are required" },
        { status: 400 }
      );
    }

    const userSnapshot = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    const username = userSnapshot.data()?.username;

    if (!username) {
      return NextResponse.json(
        { error: "User profile incomplete" },
        { status: 400 }
      );
    }

    const created = await adminDb.collection("comments").add({
      newsId,
      user: username,
      userId: decodedToken.uid,
      content,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to create comment",
        message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const commentId = request.nextUrl.searchParams.get("id");

  if (!commentId) {
    return NextResponse.json(
      { error: "Comment id is required" },
      { status: 400 }
    );
  }

  try {
    const [commentSnapshot, userSnapshot] = await Promise.all([
      adminDb.collection("comments").doc(commentId).get(),
      adminDb.collection("users").doc(decodedToken.uid).get(),
    ]);

    if (!commentSnapshot.exists) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    const comment = commentSnapshot.data();
    const role = userSnapshot.data()?.role;
    const isAdmin = role === "admin";
    const isAuthor = comment?.userId === decodedToken.uid;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await commentSnapshot.ref.delete();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to delete comment",
        message,
      },
      { status: 500 }
    );
  }
}
