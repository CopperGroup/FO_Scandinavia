import CreateProduct from "@/components/forms/product-forms/CreateProduct"

const Page = () => {
  return (
    <div className="w-full">
      <section className="w-full px-5 py-20 max-[420px]:px-4">
        <h1 className="w-full text-heading1-bold drop-shadow-text-blue max-[440px]:text-center">Створити товар</h1>
        <div className="mt-16 w-full">
          <CreateProduct />
        </div>
      </section>
    </div>
  )
}

export default Page

