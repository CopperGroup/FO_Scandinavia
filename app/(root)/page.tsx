"use server"

import Map from "@/components/shared/Map";
import Divider from "@/components/shared/Divider";
import AboutUs from "@/components/landing/AboutUs";
import BannerHero from "@/components/banner/BannerHero";
import { sleep } from "@/lib/utils";
import Categories from "@/components/landing/Categories";
import History from "@/components/landing/History";
import Brand from "@/components/landing/Brand";
import { fetchPageDataByNameCache, fetchPurchaseNotificationsInfoCache } from "@/lib/actions/cache";
import PurchaseNotification from "@/components/shared/PurhaseNotification";

export default async function Home() {
  const products = await fetchPurchaseNotificationsInfoCache();
  const result = await fetchPageDataByNameCache("Home");

  return (
    <>
      {/* <BannerHero/> */}
      <Categories stringifiedData={result}/>
      {/* <Divider iconUrl="" width={0} height={0} mt={0} mb={0} type="default"/>
      <AboutUs/>
      <History/>
      <Brand/> */}
      {/* <Map/>   */}
      {/* I love Liza❤️‍🔥 */}
      {/* <PurchaseNotification products={products} minInterval={30000} maxInterval={45000} maxNotifications={3} /> */}
    </>
  );
}
