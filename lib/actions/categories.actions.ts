"use server";

import { ObjectId, startSession, Types as MongooseTypes  } from "mongoose";
import Category from "../models/category.model";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { CategoriesParams, CategoryType, FetchedCategory, ProductType } from "../types/types";
import clearCache from "./cache";
import { clearCatalogCache } from "./redis/catalog.actions";
import { deleteManyProducts, deleteProduct } from "./product.actions";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import Filter from "../models/filter.model";
import mongoose from "mongoose";

const DELETEDCATEGORY_ID = "681a9c9a90b4efb3dd18d1e5"

const excludeDeletedCategory = { _id: { $ne: DELETEDCATEGORY_ID }}


export async function findCategoryByExternalId(
  externalId: string
) {
  const category = await Category.findOne({ id: externalId }).lean();

  return JSON.stringify(category);
}

export async function persistCategory(
  category: FetchedCategory,
  parentDbId?: mongoose.Types.ObjectId
) {
  const doc = new Category({
    name: category.name,
    id:   category.id,
    subCategories: [],
  });

  if (parentDbId) {
    await Category.findByIdAndUpdate(parentDbId, {
      $push: { subCategories: doc._id },
    });
  }

  await doc.save();
  return JSON.stringify(doc);
}

export async function createUrlCategories({ categories }: { categories: FetchedCategory[] }): Promise<CategoryType[]>;
export async function createUrlCategories({ categories }: { categories: FetchedCategory[] }, type: 'json'): Promise<string>;

export async function createUrlCategories({ categories }: { categories: FetchedCategory[] }, type?: 'json') {
   try {
      
    const sortedCategories = [...categories].sort((a, b) => {
        if (a.parentCategoryId && !b.parentCategoryId) return 1;
        if (!a.parentCategoryId && b.parentCategoryId) return -1;
        return 0;
    });

    // console.log(sortedCategories)
    const categoryMap = new Map<string, mongoose.Types.ObjectId>();

    for (const category of sortedCategories) {
        // Check if the category already exists
        const existingCategory = await Category.findOne({ id: category.id });

        if (existingCategory) {
            // If category already exists, update the category map
            categoryMap.set(category.id, existingCategory._id);
            continue;
        }

        // If the category doesn't exist, create it
        const newCategory = new Category({
            name: category.name,
            id: category.id,
            subCategories: [],
        });

        if (category.parentCategoryId) {
            const parentCategoryId = categoryMap.get(category.parentCategoryId);

            if (parentCategoryId) {
                await Category.findByIdAndUpdate(parentCategoryId, {
                    $push: { subCategories: newCategory._id }
                });
            }
        }

        await newCategory.save();
        categoryMap.set(category.id, newCategory._id);
    }

    const updatedCategories =  await Category.find(excludeDeletedCategory);

    if(type === 'json'){
      return JSON.stringify(updatedCategories)
    } else {
      return updatedCategories
    }
   } catch (error: any) {
     throw new Error(`Erorr creating and ${error.message}`)
   }
}

export async function updateCategories(
  products: ProductType[],
  productOperation: "create" | "update" | "delete"
) {
  try {
    connectToDB();

    // Fetch all existing categories only when necessary
    const existingCategories = await Category.find(excludeDeletedCategory);
    const categoryMap = new Map(
      existingCategories.map((cat) => [cat._id.toString(), cat])
    );

    // To track changes for recalculation
    const categoriesToUpdate: Record<
      string,
      { productIds: string[]; totalValue: number }
    > = {};

    const calculateTotalValue = async (categoryId: string): Promise<number> => {
      const category = await Category.findById(categoryId).populate("subCategories");
      if (!category) return 0;

      let totalValue = category.totalValue || 0;

      for (const subCategory of category.subCategories) {
        const subCategoryValue = await calculateTotalValue(subCategory._id.toString());
        totalValue += subCategoryValue;
      }

      return totalValue;
    };

    for (const product of products) {
      const newCategoryIds = product.category; // Updated category IDs

      if (productOperation === "create") {
        for (const categoryId of newCategoryIds) {
          if (!categoriesToUpdate[categoryId]) {
            const existingCategory = categoryMap.get(categoryId);
            categoriesToUpdate[categoryId] = {
              productIds: existingCategory ? [...existingCategory.products] : [],
              totalValue: existingCategory ? await calculateTotalValue(categoryId) : 0,
            };
          }

          const newCategory = categoriesToUpdate[categoryId];
          if (!newCategory.productIds.includes(product._id)) {
            newCategory.productIds.push(product._id);
            newCategory.totalValue += product.priceToShow || 0;
          }
        }
        continue;
      }

      for (const [categoryId, category] of categoryMap.entries()) {
        if (category.products.includes(product._id)) {
          if (!newCategoryIds.includes(categoryId) || productOperation === "delete") {
            category.products = category.products.filter(
              (id: string) => id.toString() !== product._id.toString()
            );

            const remainingProducts = await Product.find({
              _id: { $in: category.products },
            });

            category.totalValue = remainingProducts.reduce(
              (sum, prod) => sum + (prod.priceToShow || 0),
              0
            );

            categoriesToUpdate[categoryId] = {
              productIds: category.products,
              totalValue: category.totalValue,
            };
          }
        }
      }

      if (productOperation === "update") {
        for (const categoryId of newCategoryIds) {
          if (!categoriesToUpdate[categoryId]) {
            const existingCategory = categoryMap.get(categoryId);
            categoriesToUpdate[categoryId] = {
              productIds: existingCategory ? [...existingCategory.products] : [],
              totalValue: existingCategory ? existingCategory.totalValue : 0,
            };
          }

          const newCategory = categoriesToUpdate[categoryId];
          if (!newCategory.productIds.includes(product._id)) {
            newCategory.productIds.push(product._id);

            const categoryProducts = await Product.find({
              _id: { $in: newCategory.productIds },
            });
            newCategory.totalValue = categoryProducts.reduce(
              (sum, prod) => sum + (prod.priceToShow || 0),
              0
            );
          }
        }
      }
    }

    for (const categoryId in categoriesToUpdate) {
      const category = categoriesToUpdate[categoryId];
      category.productIds = Array.from(new Set(category.productIds.map((id) => id.toString())));
    }

    const categoryOps = Object.entries(categoriesToUpdate).map(
      async ([categoryId, { productIds, totalValue }]) => {
        if (categoryMap.has(categoryId)) {
          await Category.updateOne(
            { _id: categoryId },
            { products: productIds, totalValue }
          );
        }
      }
    );

    await Promise.all(categoryOps);

    clearCatalogCache();
    clearCache(["updateCategory", "updateProduct"], undefined);
  } catch (error: any) {
    throw new Error(
      `Error updating categories with products: ${error.message}`
    );
  }
}


export async function fetchAllCategories(): Promise<CategoryType[]>;
export async function fetchAllCategories(type: 'json'): Promise<string>;

export async function fetchAllCategories(type?: 'json') {
   try {
      
    connectToDB();

    const allCategories = await Category.find(excludeDeletedCategory);

    if(type === 'json'){
      return JSON.stringify(allCategories)
    } else {
      return allCategories
    }
   } catch (error: any) {
     throw new Error(`Error fetching all catgeories: ${error.message}`)
   }
}

export async function fetchRawCategoriesJSON(): Promise<string> {
  try {
    await connectToDB();

    const rawCategoriesFromDB = await Category.find(excludeDeletedCategory)
      .populate({
        path: "products",
        model: Product,
        select: 'price _id'
      })
      .lean();

    return JSON.stringify(rawCategoriesFromDB);
  } catch (error: any) {
    console.error("Error fetching raw categories JSON:", error);
    throw new Error(`Failed to fetch raw categories JSON: ${error.message}`);
  }
}

export async function fetchCategory({ categoryId }: { categoryId: string }) {
  try {
    connectToDB();

    // Fetch the category by its ID and populate its products
    const categoryData = await Category.findById(categoryId).populate("products");

    if (!categoryData) {
      throw new Error("Category not found");
    }

    const products = categoryData.products;
    const category = {
      _id: categoryData._id,
      categoryName: categoryData.name,
      totalProducts: 0,
      totalValue: 0,
      averageProductPrice: 0,
      averageDiscountPercentage: 0,
    };

    let totalPriceWithoutDiscount = 0;

    for (const product of products) {
      category.totalProducts += 1;
      category.totalValue += product.priceToShow;
      totalPriceWithoutDiscount += product.price;
    }

    category.averageProductPrice =
      category.totalProducts !== 0 ? category.totalValue / category.totalProducts : 0;

    category.averageDiscountPercentage = 100 - parseInt(
      (
        (totalPriceWithoutDiscount !== 0
          ? category.totalValue / totalPriceWithoutDiscount
          : 0) * 100
      ).toFixed(0)
    );

    return { ...category, stringifiedProducts: JSON.stringify(products) };
  } catch (error: any) {
    throw new Error(`Error fetching category: ${error.message}`);
  }
}

export async function setCategoryDiscount({categoryId, percentage}: {categoryId: string, percentage: number}) {
  try {
    connectToDB();

    // Fetch the category by its ID and populate its products

    // console.log(percentage)
    const category = await Category.findById(categoryId).populate("products");

    if (!category) {
      throw new Error("Category not found");
    }

    const products = category.products;
    let totalValue = 0;
    for (const product of products) {
      const priceWithDiscount = product.price - product.price * (percentage / 100);
      product.priceToShow = priceWithDiscount;

      totalValue += priceWithDiscount
      await product.save();
    }

    category.totalValue = totalValue;

    await category.save();
    // Clear the cache after updating product prices
    await clearCatalogCache();
    clearCache(["updateCategory", "updateProduct"], undefined);

  } catch (error: any) {
    throw new Error(`Error changing discount for all the products in the category: ${error.message}`);
  }
}

export async function changeCategoryName({ categoryId, newName }: { categoryId: string, newName: string }) {
  try {
    connectToDB();

    // Find the category by its _id
    const category = await Category.findById(categoryId);

    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found`);
    }

    // Update the category name
    category.name = newName;
    await category.save();

    // Update the category name in all associated products
    await clearCatalogCache();

    clearCache(["updateCategory","updateProduct"], undefined);
  } catch (error: any) {
    throw new Error(`Error changing category's name: ${error.message}`);
  }
}

export async function moveProductsToCategory({
  initialCategoryId,
  targetCategoryId,
  productIds,
}: {
  initialCategoryId: string;
  targetCategoryId: string;
  productIds: string[];
}) {
  try {
    connectToDB();

    const initialCategory = await Category.findById(initialCategoryId).populate("products");
    if (!initialCategory) {
      throw new Error(`Initial category with ID ${initialCategoryId} not found`);
    }

    const targetCategory = await Category.findById(targetCategoryId);
    if (!targetCategory) {
      throw new Error(`Target category with ID ${targetCategoryId} not found`);
    }

    await Product.updateMany(
      { _id: { $in: productIds } },
      { $addToSet: { category: targetCategory._id } }
    );

    targetCategory.products.push(...productIds);

    await targetCategory.save();

    const populatedTargetCategory = await Category.findById(targetCategoryId).populate("products");

    populatedTargetCategory.totalValue = populatedTargetCategory.products.reduce((sum: number, product: ProductType) => sum + product.priceToShow, 0)

    await populatedTargetCategory.save();
    
    initialCategory.products = initialCategory.products.filter(
      (product: ProductType) => !productIds.includes(product._id.toString())
    );

    initialCategory.totalValue = initialCategory.products.reduce((sum: number, product: ProductType) => sum + (product.priceToShow || 0), 0)

    await initialCategory.save();

    await targetCategory.save();

    await clearCatalogCache();
    clearCache(["updateCategory", "updateProduct"], undefined);
    revalidatePath(`/admin/categories/edit/${initialCategoryId}`)
  } catch (error: any) {
    throw new Error(`Error moving products to another category: ${error.message}`);
  }
}

export async function getCategoriesNamesAndIds(): Promise<{ name: string; categoryId: string; }[]> {
  try {
    connectToDB();

    const categories = await Category.find(excludeDeletedCategory);

    const categoriesNamesAndIdsArray = categories.map(category => ({ name: category.name, categoryId: category._id.toString()}))

    return categoriesNamesAndIdsArray
  } catch (error: any) {
    throw new Error(`Error fetching all categories names an _ids: ${error.message}`)
  }
}

export async function getCategoriesNamesIdsTotalProducts(): Promise<{ name: string; categoryId: string; totalProducts: number, subCategories: string[] }[]> {
  try {
    connectToDB();

    const categories = await Category.find(excludeDeletedCategory);

    const categoriesNamesAndIdsArray = categories.map(category => ({ name: category.name, categoryId: category._id.toString(), totalProducts: category.products.length, subCategories: category.subCategories }))

    return categoriesNamesAndIdsArray
  } catch (error: any) {
    throw new Error(`Error fetching all categories names an _ids: ${error.message}`)
  }
}

export async function createNewCategory({ name, products, previousCategoryId }: { name: string, products: ProductType[], previousCategoryId?: string }) {
  try {
    connectToDB();

    const productIds = products.map(product => product._id);

    if(previousCategoryId) {
      const previousCategory = await Category.findById(previousCategoryId).populate("products");

      previousCategory.products = previousCategory.products.filter(
        (product: ProductType) => !productIds.includes(product._id.toString())
      );

      previousCategory.totalValue = previousCategory.products.reduce((sum: number, product: ProductType) => sum + product.priceToShow, 0)
      
      await previousCategory.save();

      revalidatePath(`/admin/categories/edit/${previousCategoryId}`)
    }

    const totalValue = products.reduce((sum, product) => sum + (product.priceToShow || 0), 0);

    const createdCategory = await Category.create({
      name,
      totalValue,

      products: productIds
    })

    // console.log(createdCategory)
    clearCatalogCache();
    clearCache(["createCategory", "updateProduct"], undefined);

    return createdCategory
  } catch (error: any) {
    throw new Error(`Error creating new category: ${error.message}`)
  }
}

interface DeleteCategoryProps {
  categoryId: string;
  removeProducts: boolean;
}

interface ICategoryDocument extends mongoose.Document {
  _id: MongooseTypes.ObjectId;
  name: string;
  products: MongooseTypes.ObjectId[] | any[];
  subCategories: MongooseTypes.ObjectId[];
  totalValue?: number;
}

export async function deleteCategory(props: DeleteCategoryProps) {
  const session = await startSession();
  session.startTransaction();

  try {
    await connectToDB();

    const categoryToDelete = await Category.findById(props.categoryId)
      .populate<{ products: any[] }>("products")
      .session(session) as ICategoryDocument | null;

    if (!categoryToDelete) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Category not found.");
    }

    const productObjectIdsToRemoveOrUpdate = categoryToDelete.products.map(
      (product) => new MongooseTypes.ObjectId(product._id)
    );

    if (props.removeProducts) {
      if (productObjectIdsToRemoveOrUpdate.length > 0) {
        await deleteManyProducts(productObjectIdsToRemoveOrUpdate.map(id => id.toString()), "keep-catalog-cache");
      }
      await Category.updateMany(
        { products: { $in: productObjectIdsToRemoveOrUpdate } },
        { $pull: { products: { $in: productObjectIdsToRemoveOrUpdate } } },
        { session }
      );
    } else {
      if (productObjectIdsToRemoveOrUpdate.length > 0) {
        await Product.updateMany(
          { _id: { $in: productObjectIdsToRemoveOrUpdate } },
          { $pull: { category: categoryToDelete._id } },
          { session }
        );
      }
    }

    const childrenOfDeletedCategoryIds: MongooseTypes.ObjectId[] = categoryToDelete.subCategories || [];
    const parentOfDeletedCategory = await Category.findOne({ subCategories: categoryToDelete._id }).session(session) as ICategoryDocument | null;

    if (parentOfDeletedCategory) {
      let newSubcategoriesForParent = parentOfDeletedCategory.subCategories || [];
      newSubcategoriesForParent = newSubcategoriesForParent.filter(
        (subId) => !subId.equals(categoryToDelete._id)
      );

      const childrenObjectIds = childrenOfDeletedCategoryIds.map(id =>
        id instanceof MongooseTypes.ObjectId ? id : new MongooseTypes.ObjectId(id)
      );
      newSubcategoriesForParent = newSubcategoriesForParent.concat(childrenObjectIds);

      const uniqueNewParentSubcategories = Array.from(new Set(newSubcategoriesForParent.map(id => id.toString())))
        .map(idStr => new MongooseTypes.ObjectId(idStr));

      await Category.updateOne(
        { _id: parentOfDeletedCategory._id },
        { $set: { subCategories: uniqueNewParentSubcategories } },
        { session }
      );
    }

    await Filter.updateOne(
      { "categories.categoryId": props.categoryId },
      { $pull: { categories: { categoryId: props.categoryId } } },
      { session }
    );

    await Category.deleteOne({ _id: categoryToDelete._id }, { session });

    await session.commitTransaction();

    await clearCatalogCache();
    clearCache(["deleteCategory", "updateProduct", "updateCategory"], undefined);

  } catch (error: any) {
    await session.abortTransaction();
    throw new Error(`Error deleting category: ${error.message}`);
  } finally {
    session.endSession();
  }
}


export async function fetchCategoriesProducts(categoryId: string, type?: 'json') {
  try {
    // Connect to the database
    await connectToDB();

    // Find the category by _id
    const category = await Category.findById(categoryId).populate('products');

    if (!category) {
      throw new Error('Category not found');
    }

    const products = category.products;

    // Return the products in the specified format
    if (type === 'json') {
      return JSON.stringify(products);
    } else {
      return products;
    }
  } catch (error: any) {
    throw new Error(`Error fetching category products: ${error.message}`);
  }
}


export async function fetchCategoriesParams(): Promise<CategoriesParams>;
export async function fetchCategoriesParams(type: 'json'): Promise<string>;

export async function fetchCategoriesParams(type?: 'json') {
  try {
      await connectToDB();
      
      const categories = await Category.find(excludeDeletedCategory).populate("products");
      
      const result = categories.reduce((acc, category) => {
          const totalProducts = category.products.length;
          const paramCounts: Record<string, number> = {};
          
          category.products.forEach((product: ProductType) => {
              product.params.forEach(param => {
                  const key = param.name;
                  if (!paramCounts[key]) {
                      paramCounts[key] = 0;
                  }
                  paramCounts[key] += 1;
              });
          });
          
          acc[category._id] = {
              name: category.name,
              totalProducts,
              params: Object.entries(paramCounts).map(([name, totalProducts]) => ({ name, totalProducts, type: ""}))
          };
          
          return acc;
      }, {});

      return type === 'json' ? JSON.stringify(result) : result;
  } catch (error: any) {
      throw new Error(`Error fetching categories params: ${error.message}`);
  }
}


export async function fetchRawCategoriesForFilterConfig(): Promise<string> {
  try {
    await connectToDB();
    
    const rawCategories = await Category.find(excludeDeletedCategory)
      .populate({
        path: "products",
        model: Product,
        select: 'params' 
      })
      .lean();

    return JSON.stringify(rawCategories);
  } catch (error: any) {
    console.error(`Error fetching raw categories for filter config: ${error.message}`);
    throw new Error(`Error fetching raw categories for filter config: ${error.message}`);
  }
}

export async function updateSubcategories({ categories }: { categories: CategoryType[] }) {
  try {
    await connectToDB();

      for (const category of categories) {
        await Category.updateOne(
          { _id: category._id },
          { $set: { subCategories: category.subCategories } }
        )
      }
    
    await clearCatalogCache();
    await clearCache("updateCategory", undefined)
  } catch (error: any) {
    throw new Error(`Error updating subcategories: ${error.message}`)
  }
}