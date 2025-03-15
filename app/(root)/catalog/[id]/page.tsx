import ProductPage from '@/components/shared/ProductPage';
import { fetchProductPageInfo } from '@/lib/actions/cache';
import { pretifyProductName, replaceDescription } from '@/lib/utils';
import { Metadata } from 'next';

const generateMetaDescription = (productName: string, productDescription: string): string => {
  let description = `${productName} - ${productDescription}`;

  if (description.length > 160) {
    description = description.substring(0, 160);
  }

  return description;
};

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { product } = await fetchProductPageInfo(params.id, "articleNumber", "-", 0);

  const optimizedDescription = generateMetaDescription(
    pretifyProductName(product.name, [], product.articleNumber || ""),
    replaceDescription(product.description)
  );

  return {
    title: pretifyProductName(product.name, [], product.articleNumber || ""),
    description: optimizedDescription,
    openGraph: {
      images: [
        {
          url: `${product.images[0]}`
        }
      ]
    }
  };
}

const Page = async ({ params }: { params: { id: string } }) => {
  if(!params.id) {
    return <h1>Product does not exist</h1>
  }

  const { product, selectParams } = await fetchProductPageInfo(params.id, "articleNumber", "-", 0);

  return (
    <section className="max-lg:-mt-24">
      <ProductPage productJson={JSON.stringify(product)} selectParams={selectParams} />
    </section>
  );
};

export default Page;

