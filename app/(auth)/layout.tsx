import type { Metadata } from "next";
import { preload } from "react-dom";
import "@/app/fonts.css";
import { PRELOAD_FONTS } from "@/lib/fonts";
import "../globals.css";
import Provider from "../Provider";
import FacebookPixel from "@/components/pixel/FacebookPixel";
import { Store } from "@/constants/store";
import { getActivePixels } from "@/lib/pixels/server";
import { ShopSettingsProvider } from "@/components/storefront/ShopSettings";
import { getFreeDelivery } from "@/lib/content/server";
import { getPromoRewards } from "@/lib/promo/server";


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

  // The shop's own font files (app/fonts.css): Latin and Cyrillic are needed on every page.

  PRELOAD_FONTS.forEach((href) => preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" }));


  return (
    <html lang="uk">
      <body className="bg-white font-sans text-brand-ink antialiased">
        <Provider>
          <FacebookPixel pixels={pixels} />
          <ShopSettingsProvider freeDelivery={freeDelivery} welcomePercent={rewards.welcome.enabled ? rewards.welcome.percent : 0}>{children}</ShopSettingsProvider>
        </Provider>
      </body>
    </html>
  );
}
