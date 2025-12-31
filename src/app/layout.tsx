import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Odusco Convert - PDF to Excel Converter",
  description: "Convert PDF documents to Excel spreadsheets with intelligent table detection. Fast, free, and runs entirely in your browser.",
  keywords: ["PDF to Excel", "PDF converter", "table extraction", "spreadsheet", "free converter"],
  authors: [{ name: "Odusco" }],
  openGraph: {
    title: "Odusco Convert - PDF to Excel Converter",
    description: "Convert PDF documents to Excel spreadsheets with intelligent table detection.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${jakarta.variable} font-sans antialiased min-h-screen flex flex-col transition-colors duration-300`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
