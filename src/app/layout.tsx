import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClassSphere — Smart Class Management Platform",
  description: "ClassSphere is a multi-tenant SaaS platform for class owners to manage students, fees, attendance, and communication all in one place.",
  keywords: "class management, student management, fee collection, attendance tracking, coaching management",
  openGraph: {
    title: "ClassSphere — Smart Class Management Platform",
    description: "Manage enrollments, billing, attendance, and communication for any class type.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Inter', sans-serif" }}>{children}</body>
    </html>
  );
}
