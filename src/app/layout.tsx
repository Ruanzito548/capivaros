import "./globals.css";
import { Michroma, Rajdhani, VT323 } from "next/font/google";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const michroma = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
});

const rajdhani = Rajdhani({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

export const metadata = {
  title: "Capivaros Templarios",
  description: "Uniao. Disciplina. Dominio.",
  icons: {
    icon: "/capilogo.png",
    shortcut: "/capilogo.png",
    apple: "/capilogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body
        className={`${michroma.variable} ${rajdhani.variable} ${vt323.variable} text-white`}
      >
        <Navbar />
        <main className="pt-28">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
