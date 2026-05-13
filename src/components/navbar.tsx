"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { isAdmin } from "@/lib/permissions";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setRole(null);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        setRole((userSnap.data()?.role as string | null) ?? null);
      } catch (error) {
        console.error("Navbar role load failed:", error);
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-[#0b0b0b] border-b border-red-800 shadow-[0_4px_20px_rgba(255,0,0,0.2)] z-50">
      
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">

        {/* LOGO */}
        <Link href="/" className="group flex items-center gap-2">
          <Image
            src="/capilogo.png"
            alt="Capivaros Logo"
            width={45}
            height={45}
            className="transition duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]"
          />
        </Link>

        {/* MENU DESKTOP */}
        <div className="hidden md:flex items-center gap-8 text-lg font-semibold tracking-wide">

          <Link href="/" className="hover:text-red-500 transition">
            Home
          </Link>

          <Link href="/dashboard" className="hover:text-red-500 transition">
            Dashboard
          </Link>

          <Link href="/time" className="hover:text-red-500 transition">
            Time
          </Link>

          <Link href="/ranking" className="hover:text-red-500 transition">
            Ranking
          </Link>

          <Link href="/trofeus" className="hover:text-red-500 transition">
            Trofeus
          </Link>

          <a
            href="https://discord.gg/ADhrNMzmTn"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-500 transition"
          >
            Discord
          </a>

          {isAdmin(role) && (
            <Link href="/admin" className="hover:text-red-500 transition">
              Admin
            </Link>
          )}

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

        {/* BOTÃO MOBILE */}
        <button
          className="md:hidden text-white text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* MENU MOBILE */}
      {menuOpen && (
        <div className="md:hidden bg-[#0b0b0b] border-t border-red-800 flex flex-col items-center gap-4 py-6 text-lg font-semibold">

          <Link href="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>

          <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
            Dashboard
          </Link>

          <Link href="/time" onClick={() => setMenuOpen(false)}>
            Time
          </Link>

          <Link href="/ranking" onClick={() => setMenuOpen(false)}>
            Ranking
          </Link>

          <Link href="/trofeus" onClick={() => setMenuOpen(false)}>
            Trofeus
          </Link>

          <a
            href="https://discord.gg/ADhrNMzmTn"
            target="_blank"
            onClick={() => setMenuOpen(false)}
          >
            Discord
          </a>

          {isAdmin(role) && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}

          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-red-400"
              >
                Perfil
              </Link>

              <button
                onClick={handleLogout}
                className="bg-red-700 px-4 py-1 rounded"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="bg-red-700 px-4 py-1 rounded"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
