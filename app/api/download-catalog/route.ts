import { fetchAllCategories } from "@/lib/actions/categories.actions";
import { CategoryData, ProductData, ShopData } from "@/lib/types/export-xml";
import { generateYmlCatalogXml } from "@/lib/xml-parser/export";
import { type NextRequest, NextResponse } from "next/server";

export type CategoryType = {
  _id: string;
  id: string;
  name: string;
  products: string[];
  totalValue: number;
  subCategories: string[];
};

function transformFetchedCategoriesToCategoryData(
  fetchedCategories: CategoryType[]
): CategoryData[] {
  const outputList: CategoryData[] = [];
  const categoryMapBy_Id = new Map<string, CategoryType>();
  const parentIdAssignments = new Map<string, string>();

  for (const cat of fetchedCategories) {
    categoryMapBy_Id.set(cat._id.toString(), cat);
  }

  console.log(categoryMapBy_Id)
  for (const parentCat of fetchedCategories) {
    const parentPublicId = parentCat.id;

    if (parentCat.subCategories && Array.isArray(parentCat.subCategories)) {
      for (const child_InternalId of parentCat.subCategories) {
        const childCatObject = categoryMapBy_Id.get(child_InternalId.toString());
        console.log(childCatObject)
        if (childCatObject) {
          parentIdAssignments.set(childCatObject.id, parentPublicId);
        }
      }
    }
  }

  for (const cat of fetchedCategories) {
    outputList.push({
      id: cat.id,
      name: cat.name,
      parentId: parentIdAssignments.get(cat.id),
    });
  }

  return outputList;
}

export async function POST(request: NextRequest) {
  try {
    const { products, categories } = await request.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: "Invalid products data" }, { status: 400 });
    }
    const categoriesData: CategoryData[] = transformFetchedCategoriesToCategoryData(categories);

    const shopData: ShopData = {
      name: 'Интернет-магазин "Sveamoda',
      company: 'Интернет-магазин "Sveamoda',
      url: "https://sveamoda.com.ua/",
      currencies: [
        { id: "USD", rate: "CB" },
        { id: "RUR", rate: "CB" },
        { id: "UAH", rate: "1" },
        { id: "BYN", rate: "CB" },
        { id: "KZT", rate: "CB" },
        { id: "EUR", rate: "CB" },
      ],
      local_delivery_cost: "50.00",
    };

    const productsData: ProductData[] = products.map((product: any) => {
      let productCategoryId = categories.find((c: CategoryType) => c._id.toString() === product.category[0])?.id

      return {
        id: product.articleNumber || product.id,
        name: product.name,
        isAvailable: product.isAvailable,
        price: product.price,
        priceToShow: product.priceToShow,
        currencyId: "UAH",
        categoryId: productCategoryId!,
        vendor: product.vendor || "",
        images: (Array.isArray(product.images) && product.images.length > 0)
                  ? product.images.map(String)
                  : ["https://sveamoda.com.ua/placeholder-product-image.jpg"],
        quantity: product.quantity !== undefined ? product.quantity : (product.isAvailable ? 10 : 0),
        description: product.description || `<p>Опис товару ${product.name}</p>`,
        params: Array.isArray(product.params) ? product.params : [],
        url: product.url || undefined,
        country_of_origin: product.country_of_origin || undefined,
      };
    });

    const xmlString = generateYmlCatalogXml(shopData, categoriesData, productsData);

    return new NextResponse(xmlString, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sveamoda_catalog.xml"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: `Failed to generate XML catalog: ${error.message}` }, { status: 500 });
  }
}