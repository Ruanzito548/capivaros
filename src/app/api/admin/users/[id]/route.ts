import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canManageRoles } from "@/lib/permissions";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminRole = adminUserSnap.data()?.role;

    if (!canManageRoles(adminRole ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (id === decodedToken.uid) {
      return NextResponse.json(
        { error: "Voce nao pode excluir sua propria conta por aqui" },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("users").doc(id);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [commentsSnap, requestsSnap] = await Promise.all([
      adminDb.collection("comments").where("userId", "==", id).get(),
      adminDb.collection("characterRequests").where("userId", "==", id).get(),
    ]);

    const deleteOperations: Promise<unknown>[] = [
      userRef.delete(),
      ...commentsSnap.docs.map((docSnap) => docSnap.ref.delete()),
      ...requestsSnap.docs.map((docSnap) => docSnap.ref.delete()),
    ];

    await Promise.all(deleteOperations);

    try {
      await adminAuth.deleteUser(id);
    } catch (error) {
      console.warn("Nao foi possivel excluir usuario do Auth:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to delete user", message },
      { status: 500 }
    );
  }
}
