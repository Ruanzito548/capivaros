"use client";

import { auth, db } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  async function handleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Novo usuário
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          role: "member",
          createdAt: new Date(),
        });

        router.push("/complete-profile");
        return;
      }

      const data = userSnap.data();

      // Verifica se perfil está incompleto
      if (!data.username || !data.phone) {
        router.push("/complete-profile");
      } else {
        router.push("/dashboard");
      }

    } catch (error) {
      console.error("Erro no login:", error);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <button
        onClick={handleLogin}
        className="bg-green-600 px-6 py-3 rounded-lg hover:bg-green-700 transition"
      >
        Entrar com Google
      </button>
    </div>
  );
}