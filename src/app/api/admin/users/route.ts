import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canManageRoles } from "@/lib/permissions";

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
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminRole = adminUserSnap.data()?.role;

    if (!canManageRoles(adminRole ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usersSnap = await adminDb.collection("users").get();

    const users = usersSnap.docs.map((userDoc) => {
      const data = userDoc.data();

      return {
        id: userDoc.id,
        username: data.username || "Sem username",
        email: data.email || "",
        role: data.role || "visitor",
        createdAt:
          typeof data.createdAt?.toMillis === "function"
            ? data.createdAt.toMillis()
            : null,
      };
    });

    users.sort((a, b) =>
      a.username.localeCompare(b.username, "pt-BR", { sensitivity: "base" })
    );

    return NextResponse.json(users);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to fetch users", message },
      { status: 500 }
    );
  }
}
