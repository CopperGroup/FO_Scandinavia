import ProductsTable from "../../../components/admin-components/ProductsTable"
import { fetchProducts } from "@/lib/actions/product.actions"

const Page = async () => {
  const products = await fetchProducts()

  return (
    <section className="w-full py-10 px-4 max-[420px]:px-2">
      <ProductsTable stringifiedProducts={JSON.stringify(products)} />
    </section>
  )
}

export default Page

