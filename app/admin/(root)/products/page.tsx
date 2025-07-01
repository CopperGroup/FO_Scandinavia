import ProductsTable from "@/components/admin-components/ProductsTable"
import { fetchAllProducts, fetchProducts } from "@/lib/actions/product.actions"


interface PageProps {
  searchParams: {
    search?: string
    searchField?: string
    priceMin?: string
    priceMax?: string
    createdFrom?: string
    createdTo?: string
    updatedFrom?: string
    updatedTo?: string
    sortField?: string
    sortDirection?: string
    page?: string
  }
}

const Page = async ({ searchParams }: PageProps) => {
  const products = await fetchProducts()

  return (
    <section className="w-full px-2 py-10 pt-3">
      <ProductsTable
        stringifiedProducts={products}
        initialFilters={{
          search: searchParams.search || "",
          searchField: searchParams.searchField || "name",
          priceMin: searchParams.priceMin || "",
          priceMax: searchParams.priceMax || "",
          createdFrom: searchParams.createdFrom || "",
          createdTo: searchParams.createdTo || "",
          updatedFrom: searchParams.updatedFrom || "",
          updatedTo: searchParams.updatedTo || "",
          sortField: searchParams.sortField || "",
          sortDirection: (searchParams.sortDirection as "asc" | "desc") || "asc",
          page: Number.parseInt(searchParams.page || "1"),
        }}
      />
    </section>
  )
}

export default Page
