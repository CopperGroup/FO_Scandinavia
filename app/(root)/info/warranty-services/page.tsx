import type { Metadata } from "next"
import RichText from "@/components/content/RichText"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"
import { getContent } from "@/lib/content/server"

export const metadata: Metadata = {
  title: "Обмін і повернення",
  description: "Умови обміну та повернення товарів протягом 14 днів.",
  alternates: { canonical: "/info/warranty-services" },
}

/** The texts are edited in the admin: Сторінки → Обмін і повернення. */
export default async function ReturnsPage() {
  const { sections } = await getContent<{ sections: { title: string; text: string }[] }>("returns")

  return (
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={[{ label: "Обмін і повернення" }]} />
      <h1 className="heading-display mt-3 text-2xl sm:text-3xl">Обмін і повернення</h1>

      <div className="mt-8 max-w-[68ch] space-y-10">
        {sections
          .filter((section) => section.title || section.text)
          .map((section, index) => (
            <section key={`${index}-${section.title}`} aria-labelledby={`returns-${index}`} data-edit={`returns:sections.${index}`}>
              <h2 id={`returns-${index}`} className="heading-display text-xl">
                {section.title}
              </h2>
              <RichText text={section.text} className="rich-text rich-text-quiet mt-3" />
            </section>
          ))}
      </div>
    </div>
  )
}
