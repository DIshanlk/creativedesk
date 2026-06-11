import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SpaceProvider } from "@/context/SpaceContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CreativeDesk",
  description: "Design Team Work Management Platform",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SpaceProvider>
            {children}
          </SpaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
