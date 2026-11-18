import { Suspense } from "react";
import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import "../globals.css";
import Provider from "../Provider";
import { AppWrapper } from "./context";
import { SpeedInsights } from "@vercel/speed-insights/next";
import FacebookPixel from "@/components/pixel/FacebookPixel";
import { getActivePixels } from "@/lib/pixels/server";
import { NO_ACTIVE_PIXELS } from "@/lib/pixels/shared";
import { PostHogProvider } from "@/components/PostHogProvider";
import CartDrawer from "@/components/storefront/CartDrawer";
import ContactFab from "@/components/storefront/ContactFab";
import MobileTabBar from "@/components/storefront/MobileTabBar";
import SiteFooter from "@/components/storefront/SiteFooter";
import SiteHeader from "@/components/storefront/SiteHeader";
import { ShopSettingsProvider } from "@/components/storefront/ShopSettings";
import { getPromoRewards } from "@/lib/promo/server";
import PreviewBridge from "@/components/content/PreviewBridge";
import { getFreeDelivery, previewing } from "@/lib/content/server";
import { Store } from "@/constants/store";
import { getCurrentUser, getStoreContacts } from "@/lib/storefront/session";

// Text face drawn for Cyrillic first; display face only for headings and the wordmark.
const textFont = Golos_Text({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-text" });
const displayFont = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "600"], display: "swap", variable: "--font-display" });

export const metadata: Metadata = {
  // Without it Open Graph images and canonical links of a self-hosted build point at localhost.
  metadataBase: new URL(Store.domain),
  title: {
    default: `${Store.name} — товари зі Скандинавії`,
    template: `%s — ${Store.name}`,
  },
  description: "Одяг, взуття, речі для дому та продукти зі Скандинавії з доставкою по Україні.",
  openGraph: { type: "website", siteName: Store.name, locale: "uk_UA" },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, contacts, pixels, freeDelivery, rewards] = await Promise.all([getCurrentUser(), getStoreContacts(), getActivePixels(), getFreeDelivery(), getPromoRewards()]);
  // Inside the page editor of the admin panel: no analytics, and the page talks to the editor.
  const inEditor = await previewing();

  return (
    <html lang="uk" className={`${textFont.variable} ${displayFont.variable}`}>
      <body className="bg-white font-sans text-brand-ink antialiased">
        <FacebookPixel pixels={inEditor ? NO_ACTIVE_PIXELS : pixels} />
        {inEditor && <PreviewBridge />}
        <PostHogProvider>
          <Provider>
            <AppWrapper>
             <ShopSettingsProvider freeDelivery={freeDelivery} welcomePercent={rewards.welcome.enabled ? rewards.welcome.percent : 0}>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand-sun focus:px-4 focus:py-2 focus:font-semibold focus:text-brand-ink"
              >
                Перейти до вмісту
              </a>
              <Suspense fallback={<div className="h-[7.5rem] bg-brand-navy lg:h-[var(--header-h)]" />}>
                <SiteHeader />
              </Suspense>
              <main id="main" className="min-h-[60vh]">
                {children}
              </main>
              <SiteFooter />
              <Suspense fallback={null}>
                <MobileTabBar likedHref={user ? `/liked/${user.id}` : "/login"} />
              </Suspense>
              <CartDrawer />
              <ContactFab phone={contacts.phone} telegram={contacts.telegram} viber={contacts.viber} hours={contacts.hours} />
             </ShopSettingsProvider>
            </AppWrapper>
          </Provider>
        </PostHogProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
