import { getDictionary } from "@hoflayn/i18n";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  const name = t("app.name");

  return {
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description: t("app.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <LocaleProvider locale={locale} dictionary={getDictionary(locale)}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
