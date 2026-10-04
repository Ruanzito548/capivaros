import "./globals.css";
import { Abril_Fatface } from "next/font/google";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const abrilFatface = Abril_Fatface({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-abril-fatface",
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
      <body className={`${abrilFatface.variable} text-white`}>
        <Navbar />
        <main className="pt-28">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
