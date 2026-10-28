"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  House,
  LogIn,
  LogOut,
  Medal,
  Menu,
  MessagesSquare,
  ShieldCheck,
  Swords,
  Trophy,
  User as UserIcon,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { isAdmin } from "@/lib/permissions";

interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  // Prefixo de rota que marca o link como ativo, quando diferente do href.
  match?: string;
  external?: boolean;
}

const DISCORD_URL = "https://discord.gg/ADhrNMzmTn";

const BASE_LINKS: NavLink[] = [
  { label: "Home", href: "/", icon: House },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Membros", href: "/time/wowforever", icon: Users, match: "/time" },
  { label: "Cores", href: "/raid-cores", icon: Swords },
  { label: "Ranking", href: "/ranking", icon: Trophy },
  { label: "Medalhas", href: "/trofeus", icon: Medal },
  { label: "Discord", href: DISCORD_URL, icon: MessagesSquare, external: true },
];

const ADMIN_LINK: NavLink = { label: "Admin", href: "/admin", icon: ShieldCheck };

function isLinkActive(pathname: string, link: NavLink) {
  if (link.external) return false;

  const base = link.match ?? link.href;
  if (base === "/") return pathname === "/";

  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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

  const links = isAdmin(role) ? [...BASE_LINKS, ADMIN_LINK] : BASE_LINKS;
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 h-[95px] border-b border-red-600/80 bg-[#080808]">
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#ff252f] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-full h-8 bg-gradient-to-b from-red-600/25 to-transparent" />

      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-6 px-4 sm:px-6">
        <Link href="/" onClick={closeMenu} className="group flex items-center">
          <Image
            src="/capilogo.png"
            alt="Capivaros Templarios"
            width={64}
            height={64}
            className="h-16 w-auto drop-shadow-[0_0_10px_rgba(255,37,47,0.55)] transition duration-300 group-hover:scale-105"
          />
        </Link>

        <div className="hidden h-full min-w-0 items-stretch justify-center gap-5 xl:flex 2xl:gap-8">
          {links.map((link) => (
            <DesktopLink
              key={link.label}
              link={link}
              active={isLinkActive(pathname, link)}
            />
          ))}
        </div>

        <div className="hidden items-center justify-end gap-4 xl:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-[17px] uppercase tracking-wider text-[#ff252f] transition hover:text-[#ff5a62] hover:[text-shadow:0_0_10px_rgba(255,37,47,0.6)]"
              >
                <UserIcon size={18} strokeWidth={2.25} />
                Perfil
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md border border-[#ff252f]/70 bg-[#4a0a0e] px-4 py-2 text-[17px] uppercase tracking-wider text-red-50 transition hover:bg-[#8a1119] hover:shadow-[0_0_14px_rgba(255,37,47,0.45)]"
              >
                <LogOut size={18} strokeWidth={2.25} />
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-md border border-[#ff252f]/70 bg-[#4a0a0e] px-4 py-2 text-[17px] uppercase tracking-wider text-red-50 transition hover:bg-[#8a1119] hover:shadow-[0_0_14px_rgba(255,37,47,0.45)]"
            >
              <LogIn size={18} strokeWidth={2.25} />
              Login
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="col-start-3 flex h-11 w-11 items-center justify-center justify-self-end rounded-md border border-red-700/70 text-[#ff252f] transition hover:bg-red-950/60 xl:hidden"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-x-0 top-[95px] max-h-[calc(100dvh-95px)] overflow-y-auto border-b border-red-600/80 bg-[#080808] shadow-[0_12px_30px_rgba(255,37,47,0.2)] xl:hidden">
          <ul className="mx-auto flex max-w-md flex-col gap-1 px-4 py-5">
            {links.map((link) => (
              <li key={link.label}>
                <MobileLink
                  link={link}
                  active={isLinkActive(pathname, link)}
                  onNavigate={closeMenu}
                />
              </li>
            ))}
          </ul>

          <div className="mx-auto flex max-w-md flex-col gap-3 border-t border-red-900/70 px-4 py-5">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-3 py-2 text-lg uppercase tracking-wider text-[#ff252f]"
                >
                  <UserIcon size={20} strokeWidth={2.25} />
                  Perfil
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    void handleLogout();
                  }}
                  className="flex items-center justify-center gap-2 rounded-md border border-[#ff252f]/70 bg-[#4a0a0e] px-4 py-3 text-lg uppercase tracking-wider text-red-50 transition hover:bg-[#8a1119]"
                >
                  <LogOut size={20} strokeWidth={2.25} />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex items-center justify-center gap-2 rounded-md border border-[#ff252f]/70 bg-[#4a0a0e] px-4 py-3 text-lg uppercase tracking-wider text-red-50 transition hover:bg-[#8a1119]"
              >
                <LogIn size={20} strokeWidth={2.25} />
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function DesktopLink({ link, active }: { link: NavLink; active: boolean }) {
  const Icon = link.icon;
  const className = `group relative flex items-center gap-2 text-[17px] uppercase tracking-wider transition-colors duration-200 ${
    active
      ? "text-[#ff252f]"
      : "text-zinc-300 hover:text-[#ff252f] hover:[text-shadow:0_0_10px_rgba(255,37,47,0.5)]"
  }`;
  const content = (
    <>
      <Icon
        size={18}
        strokeWidth={2.25}
        className="transition group-hover:drop-shadow-[0_0_6px_rgba(255,37,47,0.7)]"
      />
      <span>{link.label}</span>
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#ff252f] shadow-[0_0_10px_2px_rgba(255,37,47,0.8)]" />
      )}
    </>
  );

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  );
}

function MobileLink({
  link,
  active,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = link.icon;
  const className = `flex items-center gap-3 rounded-md border-l-4 px-3 py-3 text-lg uppercase tracking-wider transition-colors ${
    active
      ? "border-[#ff252f] bg-red-950/40 text-[#ff252f]"
      : "border-transparent text-zinc-300 hover:bg-red-950/30 hover:text-[#ff252f]"
  }`;
  const content = (
    <>
      <Icon size={20} strokeWidth={2.25} />
      <span>{link.label}</span>
    </>
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {content}
    </Link>
  );
}
