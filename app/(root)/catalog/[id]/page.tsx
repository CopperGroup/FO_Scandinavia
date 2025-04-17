import ProductPage from '@/components/shared/ProductPage';
import { Store } from '@/constants/store';
import { fetchProductPageInfo } from '@/lib/actions/cache';
import { fetchProductAndRelevantParams } from '@/lib/actions/product.actions';
import { ProductSelectParams } from '@/lib/types/types';
import { pretifyProductName, replaceDescription } from '@/lib/utils';
import { Metadata } from 'next';
import { revalidateTag } from 'next/cache';
import { notFound } from 'next/navigation';

const generateMetaDescription = (productName: string, productDescription: string): string => {
  let description = `${productName} - ${productDescription}`;

  if (description.length > 160) {
    description = description.substring(0, 140);
  }

  return description;
};

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  let product = null;
  let selectParams: any = [];
  
  try {
    ({ product, selectParams } = await fetchProductPageInfo(params.id, "articleNumber", "-", 0));
  } catch (error) {
    try {
      revalidateTag(`${Store.name}-product`);
      ({ product, selectParams } = await fetchProductAndRelevantParams(params.id, "articleNumber", "-", 0));
    } catch (error) {
      notFound();
    }
  }

  const optimizedDescription = generateMetaDescription(
    pretifyProductName(product.name, [], product.articleNumber || "", 0),
    replaceDescription(product.description)
  );

  return {
    title: pretifyProductName(product.name, [], product.articleNumber || "", 0),
    description: optimizedDescription,
    openGraph: {
      type: "website",
      siteName: Store.name,
      url: `${Store.domain}/catalog/${product._id}`
    }
  };
}

const Page = async ({ params }: { params: { id: string } }) => {
  if(!params.id) {
    return <h1>Product does not exist</h1>
  }
  
  let product = null;
  let selectParams: any = [];
  
  try {
    ({ product, selectParams } = await fetchProductPageInfo(params.id, "articleNumber", "-", 0));
  } catch (error) {
    try {
      revalidateTag(`${Store.name}-product`);
      ({ product, selectParams } = await fetchProductAndRelevantParams(params.id, "articleNumber", "-", 0));
    } catch (error) {
      notFound();
    }
  }
  
  return (
    <section className="max-lg:-mt-24">
      <ProductPage productJson={JSON.stringify(product)} selectParams={selectParams} />
    </section>
  );
};

export default Page;

