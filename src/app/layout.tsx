import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

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
      <body className="text-white">
        <Navbar />
        <main className="pt-28">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
