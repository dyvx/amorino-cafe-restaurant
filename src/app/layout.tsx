import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND_CONFIG } from "@/config/brand";
import { PwaRegistrar } from "@/components/PwaRegistrar";

export const metadata: Metadata = {
  title: {
    default: "Amorino Cafe & Restaurant | Luxury Table Ordering — Kenya",
    template: "%s | Amorino Cafe & Restaurant",
  },
  description:
    "Experience artisanal East African coffee heritage and contemporary culinary craftsmanship at Amorino Cafe & Restaurant, Kenya. Scan your table QR code to order seamlessly.",
  manifest: "/manifest.json",
  icons: {
    icon: BRAND_CONFIG.localLogoPath,
    shortcut: BRAND_CONFIG.localLogoPath,
    apple: BRAND_CONFIG.localLogoPath,
  },
  openGraph: {
    title: "Amorino Cafe & Restaurant — Kenya",
    description:
      "Luxury café, specialty roastery, and contemporary restaurant digital dining experience.",
    type: "website",
    locale: "en_KE",
    siteName: BRAND_CONFIG.name,
    images: [
      {
        url: BRAND_CONFIG.officialLogoUrl,
        width: 800,
        height: 800,
        alt: "Amorino Cafe & Restaurant Official Logo",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#070504",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: BRAND_CONFIG.name,
    image: BRAND_CONFIG.officialLogoUrl,
    address: {
      "@type": "PostalAddress",
      addressCountry: "KE",
    },
    servesCuisine: [
      "Specialty Coffee",
      "Contemporary Continental",
      "East African Fusion",
      "Artisanal Patisserie",
    ],
    priceRange: "KES",
  };

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="bg-obsidian text-crema min-h-screen selection:bg-gold/30 selection:text-crema">
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
