import ProductsTable from "../../../components/admin-components/ProductsTable"
import { fetchProducts } from "@/lib/actions/product.actions"

const Page = async () => {

  const products = await fetchProducts(); 

  return (
    <section className="px-5 py-10 w-full max-[420px]:px-0"> 
      <ProductsTable stringifiedProducts={JSON.stringify(products)}/>
    </section>
  )
}

export default Page