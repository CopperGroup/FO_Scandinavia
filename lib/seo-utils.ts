import { Store } from "@/constants/store";

export function generateMetaDescription(
    productName: string,
    description: string,
    params: Array<{ name: string; value: string }>,
    storeName: string,
  ): string {
    // Extract key product features
    const keyFeatures = params
      .filter((param) => ["Процесор", "Пам'ять", "Екран", "Камера"].includes(param.name))
      .map((param) => `${param.name}: ${param.value.replaceAll("_", " ")}`)
      .join(", ")
  
    // Create optimized meta description
    return keyFeatures
      ? `${productName} - ${keyFeatures}. Купуйте з гарантією від ${storeName}.`
      : `${productName} - Купуйте з гарантією доставкою від ${storeName}. ${description.slice(0, 120).replace(/<\/?[^>]+(>|$)/g, "")}`
  }
  
  /**
   * Generates SEO-friendly title for product pages
   */
  export function generateSeoTitle(productName: string, storeName: string, price: number, currency: string): string {
    return `${productName} | Купити в ${storeName} | Ціна ${price} ${currency}`
  }
  
  /**
   * Generates keywords for product pages
   */
  export function generateKeywords(
    productName: string,
    categoryName: string,
    params: Array<{ name: string; value: string }>,
  ): string {
    const paramValues = params.map((p) => p.value).join(", ")
    return `${productName}, ${categoryName}, ${paramValues}, купити, ціна`
  }
  
  /**
   * Extracts clean text from HTML content
   */
  export function stripHtml(html: string): string {
    return html.replace(/<\/?[^>]+(>|$)/g, "")
  }
  
  /**
   * Generates structured data for product FAQs
   */
  export function generateProductFaqs(
    productName: string,
    params: Array<{ name: string; value: string }>,
    currencySign: string,
  ) {
    return [
      {
        question: `Які характеристики має ${productName}?`,
        answer: `${productName} має наступні характеристики: ${params
          .slice(0, 3)
          .map((p) => `${p.name}: ${p.value}`)
          .join(", ")}${params.length > 3 ? " та інші." : "."}`,
      },
      {
        question: `Яка гарантія на ${productName}?`,
        answer: `${params.find((param) => param.name === "Гарантія")?.value || "Стандартна гарантія"} від виробника.`,
      },
      // {
      //   question: `Чи доступна безкоштовна доставка для ${productName}?`,
      //   answer: `Так, безкоштовна доставка доступна при замовленні від ${currencySign}${Store.freeDelivery}.`,
      // },
    ]
  }
  