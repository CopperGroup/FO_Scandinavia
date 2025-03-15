import Image from "next/image"
import { Button } from "@/components/ui/button"
import ExploreCollectionsButton from "./BannerActions/ExploreCollectionsButton"
import Link from "next/link"

export default function BannerHero() {
  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      <Image
        src="/assets/banner-hero.jpg"
        alt="Fashion model in Scandinavian attire"
        layout="fill"
        objectFit="cover"
        quality={100}
        priority
        className="opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent">
        <div className="container mx-auto h-full flex items-center">
          <div className="max-w-2xl space-y-8">
            <h1 className="font-extrabold text-white adaptiveHeading">
              Sveamoda
            </h1>
            <p className="text-body-normal md:text-heading4-medium md:font-normal text-neutral-300 max-w-xl max-[420px]:text-base-regular">
              Скандинавська якість у кожному ковтку, кроці та страві.
            </p>
            <div className="w-full flex gap-4 max-[465px]:flex-col">
              <Link href="/catalog?page=1&sort=default" className="max-[465px]:w-full" title="Shop Now">
                <Button size="lg" className="w-full bg-white text-black rounded-none hover:bg-neutral-200 px-8 py-6 text-lg">
                  Shop Now
                </Button>
              </Link>
              <ExploreCollectionsButton componentId="categories">
                Explore Collection
              </ExploreCollectionsButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

