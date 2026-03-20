"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

export default function Navbar() {

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-[#0b0b0b] border-b border-red-800 shadow-[0_4px_20px_rgba(255,0,0,0.2)] z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-center px-8 py-4">

        <div className="flex items-center gap-10 text-lg font-semibold tracking-wide">

          {/* ESQUERDA */}
          <Link href="/" className="hover:text-red-500 transition">
            Home
          </Link>

          <Link href="/dashboard" className="hover:text-red-500 transition">
            Dashboard
          </Link>

          <Link href="/time" className="hover:text-red-500 transition">
            Time
          </Link>

          {/* LOGO CENTRAL */}
          <Link href="/" className="mx-8 group">
            <Image
              src="/capilogo.png"
              alt="Capivaros Logo"
              width={55}
              height={55}
              className="transition duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]"
            />
          </Link>

          {/* DIREITA */}
          <Link href="/marketplace" className="hover:text-red-500 transition">
            Marketplace
          </Link>

          <Link href="/contato" className="hover:text-red-500 transition">
            Contato
          </Link>

          <a
            href="https://discord.gg/mTGxfJv9TR"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-500 transition"
          >
            Discord
          </a>

          {/* USUÁRIO */}
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-red-400 hover:text-red-500 transition"
              >
                Perfil
              </Link>

              <button
                onClick={handleLogout}
                className="bg-red-700 px-4 py-1 rounded hover:bg-red-800 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-red-700 px-4 py-1 rounded hover:bg-red-800 transition"
            >
              Login
            </Link>
          )}

        </div>
      </div>
    </nav>
  );
}