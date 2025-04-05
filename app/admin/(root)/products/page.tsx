import ProductsTable from "@/components/admin-components/ProductsTable"
import { fetchProducts } from "@/lib/actions/product.actions"

const Page = async () => {
  const products = await fetchProducts()

  return (
    <section className="w-full px-5 py-10 pt-3 max-[420px]:px-2">
      <ProductsTable stringifiedProducts={JSON.stringify(products)} />
    </section>
  )
}

export default Page

