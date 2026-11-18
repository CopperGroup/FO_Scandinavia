import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import "../globals.css";
import Provider from "../Provider";
import FacebookPixel from "@/components/pixel/FacebookPixel";
import { Store } from "@/constants/store";
import { getActivePixels } from "@/lib/pixels/server";
import { ShopSettingsProvider } from "@/components/storefront/ShopSettings";
import { getFreeDelivery } from "@/lib/content/server";
import { getPromoRewards } from "@/lib/promo/server";

const textFont = Golos_Text({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-text" });
const displayFont = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "600"], display: "swap", variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(Store.domain),
  title: {
    default: `Вхід — ${Store.name}`,
    template: `%s — ${Store.name}`,
  },
  robots: { index: false, follow: false },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [pixels, freeDelivery, rewards] = await Promise.all([getActivePixels(), getFreeDelivery(), getPromoRewards()]);

  return (
    <html lang="uk" className={`${textFont.variable} ${displayFont.variable}`}>
      <body className="bg-white font-sans text-brand-ink antialiased">
        <Provider>
          <FacebookPixel pixels={pixels} />
          <ShopSettingsProvider freeDelivery={freeDelivery} welcomePercent={rewards.welcome.enabled ? rewards.welcome.percent : 0}>{children}</ShopSettingsProvider>
        </Provider>
      </body>
    </html>
  );
}
