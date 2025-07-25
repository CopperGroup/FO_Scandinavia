"use server";

import Product from "../models/product.model"
import { connectToDB } from "../mongoose"
import User from "../models/user.model";
import { revalidatePath } from "next/cache";
import { CategoryType, CreateUrlParams, ProductType } from "../types/types";
import { clearCatalogCache } from "./redis/catalog.actions";
import Order from "../models/order.model";
import clearCache from "./cache";
import { createNewCategory, updateCategories } from "./categories.actions";
import Category from "../models/category.model";
import { startSession } from "mongoose";
import { pretifyProductName } from "../utils";
import { addPromo } from "./user.actions";

interface CreateParams {
    _id?: string,
    id: string,
    name: string,
    quantity: number,
    images: string[],
    url: string,
    price: number,
    priceToShow: number,
    vendor: string,
    category: string[],
    description: string,
    isAvailable: boolean,
    articleNumber?: string,
    params?: {
        name: string,
        value: string
    }[],
    customParams?: {
        name: string,
        value:string,
    }[]
    newCategories?: string[]
}


interface InterfaceProps {
    productId: string,
    email: string,
    path: string,
}

const DELETEDPRODUCT_ID = "681a9c16b06f4e599d07371e";

export async function createUrlProduct({ id, name, isAvailable, quantity, url, priceToShow, price, images, vendor, description, articleNumber, params, isFetched, category }: CreateUrlParams){
    try {
        connectToDB();
        
        const createdProduct = await Product.create({
            id: id,
            name: name,
            isAvailable: isAvailable,
            quantity: quantity,
            url: url,
            priceToShow: priceToShow,
            price: price,
            images: images,
            vendor: vendor,
            description: description,
            params: params,
            articleNumber: articleNumber,
            isFetched: isFetched,
            category: category ? category : ["No-category"]
        })

        clearCache("createProduct", undefined)
    } catch (error: any) {
        throw new Error(`Error creating url-product, ${error.message}`)
    }
}

export async function updateUrlProductsOneByOne(products: Partial<CreateUrlParams>[]) {
    try {
      await connectToDB();
  
      const updatedProducts = [];
  
      for (const product of products) {
        if (!product._id) continue; // skip if no ID
  
        const updated = await Product.findByIdAndUpdate(
          product._id,
          { $set: product },
          { new: true }
        );
  
        if (updated) {
          updatedProducts.push(updated);
        }
      }
  
      await updateCategories(updatedProducts, "update");
      clearCache("createProduct", undefined);
    } catch (error: any) {
      throw new Error(`Error updating url-products one by one, ${error.message}`);
    }
  }  

export async function updateUrlProductsMany(products: Partial<CreateUrlParams>[]) {
    try {
        await connectToDB();

        const bulkOperations = products.map(product => ({
            updateOne: {
                filter: { _id: product._id },
                update: { $set: product },
            },
        }));

        await Product.bulkWrite(bulkOperations);

        const updatedProducts = await Product.find({ _id: { $in: products.map(product => product._id)}});

        await updateCategories(updatedProducts, "update")
        clearCache("createProduct", undefined);
    } catch (error: any) {
        throw new Error(`Error updating url-products in bulk, ${error.message}`);
    }
}

export async function createProduct(params: CreateParams): Promise<ProductType>;
export async function createProduct(params: CreateParams, type: "json"): Promise<string>;

export async function createProduct({ id, name, quantity, images, url, priceToShow, price, vendor, category, articleNumber, description, isAvailable, customParams, newCategories }: CreateParams, type?: "json"): Promise<ProductType | string>{
    try {
        connectToDB();
        
        const createdProduct = await Product.create({
            id: id,
            name: name,
            images: images,
            quantity: quantity,
            url: url,
            price: price,
            priceToShow: priceToShow,
            category: category,
            vendor: vendor,
            description: description,
            articleNumber: articleNumber || "",
            isAvailable: isAvailable,
            params: customParams || []
        })
        
        const createdCategoriesIds = [];

        if(newCategories) {
            for(const newCategory of newCategories) {
                const result = await createNewCategory({ name: newCategory, products: [createdProduct._id]})
    
                await createdCategoriesIds.push(result._id)
            }

            await Product.findByIdAndUpdate(
                createdProduct._id,
                {
                    $addToSet: { category: createdCategoriesIds }
                }
            )
        }

        for(const existingCategoryId of category) {
            await Category.findByIdAndUpdate(
                existingCategoryId,
                {
                    $addToSet: { products: createdProduct._id }
                }
            )
        }

        await clearCatalogCache();

        clearCache("createProduct", undefined);

        if(type === "json") {
            return JSON.stringify(createdProduct)
        } else {
            return createdProduct;
        }
    } catch (error: any) {
        throw new Error(`Error creating new product, ${error.message}`)
    }
}

export async function updateUrlProduct({_id, id, name, isAvailable, quantity, url, priceToShow, price, images, vendor, description, params, isFetched, category }: CreateUrlParams){
    try {
        connectToDB();
        
        const product = await Product.findByIdAndUpdate(_id, {
            id: id,
            name: name,
            isAvailable: isAvailable,
            quantity: quantity,
            url: url,
            priceToShow: priceToShow,
            price: price,
            images: images,
            vendor: vendor,
            description: description,
            params: params,
            isFetched: isFetched,
            category: category ? category : ["No-category"]
        })
        
        clearCache("updateProduct", _id as string)

        
        //console.log(product);
    } catch (error: any) {
        throw new Error(`Error creating url-product, ${error.message}`)
    }
}

export async function deleteUrlProducts(){
    try {
        connectToDB();

        const productsToDelete = await Product.find({ isFetched: true});

        await deleteManyProducts(productsToDelete.map(p => p._id))

        clearCache("deleteProduct", undefined)
    } catch (error: any) {
        throw new Error(`Error deleting fetched products, ${error.message}`)
    }
}

export async function fetchUrlProducts(type?: "json"){
    try {
        connectToDB();
        
        const urlProducts = await Product.find({_id: {$ne: DELETEDPRODUCT_ID}, isFetched: true }).select("_id id articleNumber category");

        if(type === "json"){
            return JSON.stringify(urlProducts)
        } else{
            return urlProducts;
        }
    } catch (error: any) {
        throw new Error(`Error finding url-added products: ${error.message}`)
    }
}

export async function fetchAllProducts() {
    try {
        connectToDB();
        
        const fetchedProducts = await Product.find({ _id: { $ne: DELETEDPRODUCT_ID }, isAvailable: true, quantity: { $gt: 0 } })
        .populate({
            path: 'likedBy',
            model: User,
            select: "_id email"
        })
        
        return JSON.parse(JSON.stringify(fetchedProducts))

    } catch (error:any) {
        throw new Error(`Error fetching all available products, ${error.message}`)
    }
}

export async function fetchProducts() {
  try {
    connectToDB();

    const products = await Product.find({ _id: { $ne: DELETEDPRODUCT_ID } })
      .select("_id id vendor name isAvailable price priceToShow images category articleNumber quantity createdAt updatedAt")
      .lean();

    // Keep only the first image for each product
    const processedProducts = products.map(product => ({
      ...product,
      images: product.images?.length ? [product.images[0]] : []
    }));

    return JSON.stringify(processedProducts);
  } catch (error: any) {
    throw new Error(`Error fetching products, ${error.message}`);
  }
}

export async function fetchProductsByBatches(limit: number = 500, skip: number = 0) {
  try {
      connectToDB();

      const products = await Product.find({ _id: { $ne: DELETEDPRODUCT_ID } })
          .select("_id id vendor name isAvailable price priceToShow category articleNumber url images quantity description params")
          .skip(skip)
          .limit(limit)
          .lean();

      return JSON.stringify(products);
  } catch (error: any) {
      throw new Error(`Error fetching products, ${error.message}`);
  }
}


export async function fetchProductById(_id: string): Promise<ProductType>;
export async function fetchProductById(_id: string, type: "json"): Promise<string>;

export async function fetchProductById( _id: string, type?: "json") {
    try {
        const product = await Product.findById(_id);

        if(!product) {
            throw new Error(`Product not found`);
        }
        if(type === "json") {
            return JSON.stringify(product);
        } else {
            return product;
        }
    } catch (error: any) {
        throw new Error(`Error fetching product by _id: ${error.message}`)
    }
}

export async function addLike({ productId, email, path }: InterfaceProps) {
    try {
        connectToDB();
        
        const product = await Product.findOne({id:productId});
        if(email) {
            const currentUser = await User.findOne({email: { $regex: `^${email}$`, $options: 'i' }}); 

            const isLiked = product.likedBy.includes(currentUser._id);

            if(isLiked) {
                await product.likedBy.pull(currentUser._id);
                await currentUser.likes.pull(product._id);
            } else {
                await product.likedBy.push(currentUser._id);
                await currentUser.likes.push(product._id);
            }
    
    
            await product.save();
            await currentUser.save();

            revalidatePath(path);
            revalidatePath(`/liked/${currentUser._id}`);
        }

        clearCache("likeProduct", undefined)
    } catch (error: any) {
        throw new Error(`Error adding like to the product, ${error.message}`)
    }
}

export async function fetchLikedProducts(userId: string){
    try {
        connectToDB();

        const likedProducts = await Product.find({ isAvailable: true, likedBy: userId })
            .populate({
                path: 'likedBy',
                model: User,
                select: "_id email"
            })

        return likedProducts;
    } catch (error: any) {
        throw new Error(`Error fecthing liked posts, ${error.message}`)
    }
}

export async function editProduct(params: CreateParams): Promise<ProductType>;
export async function editProduct(params: CreateParams, type: "json"): Promise<string>;

export async function editProduct({ _id, name, quantity, images, url, priceToShow, price, vendor, category, description, isAvailable, articleNumber, customParams, newCategories }: CreateParams, type?: 'json') {
    try {
        await connectToDB();

        const createdCategoriesIds = [];

        if(newCategories) {
            for(const newCategory of newCategories) {
                const result = await createNewCategory({ name: newCategory, products: []})
    
                createdCategoriesIds.push(result._id)
            }
        }

        for(const existingCategoryId of category) {
            await Category.findByIdAndUpdate(
                existingCategoryId,
                {
                    $addToSet: { products: _id }
                }
            )
        }

        const update = {
            name,
            quantity,
            images,
            url,
            priceToShow,
            price,
            vendor,
            category: [...category, ...createdCategoriesIds],
            description,
            isAvailable,
            articleNumber: articleNumber || "",
            params: customParams ? customParams.map(param => ({ name: param.name, value: param.value })) : []
        };

        // console.log(createdCategoriesIds)
        // console.log(update)
        const updatedProduct = await Product.findOneAndUpdate({ _id }, update, { new: true });

        if (!updatedProduct) {
            throw new Error(`No product found with id ${_id}`);
        }

        await clearCatalogCache();
        clearCache("updateProduct", _id as string);
        if (type === "json") {
            return JSON.stringify(updatedProduct);
        } else {
            return updatedProduct;
        }
    } catch (error: any) {
        throw new Error(`Error updating product: ${error.message}`);
    }
}


export async function productAddedToCart(id: string) {
    try {
        connectToDB();

        const product = await Product.findById(id);

        await product.addedToCart.push(Date.now())

        await product.save();

        //console.log(product);

        clearCache("addToCart", undefined)
    } catch (error: any) {
        throw new Error(`Error adding prduct to cart: ${error.message}`)
    }
}

export async function findAllProductsCategories(type?: "json") {
    try {
      connectToDB();
  
      let allCategories: { [key: string]: number } = {};
  
      const products = await Product.find({});
  
      for (const product of products) {
        if (Array.isArray(product.category)) {
          for (const categoryId of product.category) {
            const categoryIdStr = categoryId.toString();
  
            if (!allCategories[categoryIdStr]) {
              allCategories[categoryIdStr] = 0;
            }
            
            allCategories[categoryIdStr] += 1;
          }
        }
      }
  
      const categories = Object.entries(allCategories).map(([name, amount]) => ({
        name,
        amount,
      }));
  
      if (type === "json") {
        return JSON.stringify(categories);
      } else {
        return categories;
      }
    } catch (error: any) {
      throw new Error(`${error.message}`);
    }
  }
  
  export async function deleteManyProducts(_ids: string[], cache?: "keep-catalog-cache") {
    const session = await startSession();
    session.startTransaction();
  
    try {
      await connectToDB();
  
      // Find products by their IDs
      const products = await Product.find({ _id: { $in: _ids } }).session(session);
  
      if (!products.length) {
        throw new Error("No products found for deletion");
      }
  
      // Loop over the products to handle likes and orders before deletion
      for (const product of products) {
        const deletedProductId = product._id;
  
        // Handle users who liked the product
        const usersWhoLikedProduct = await User.find({ _id: { $in: product.likedBy } }).session(session);
  
        if (usersWhoLikedProduct) {
          for (const user of usersWhoLikedProduct) {
            user.likes.pull(product._id);
            await user.save({ session });
          }
        }
  
        // Handle orders that include the product
        const orders = await Order.find({ 'products.product': product._id }).session(session);
  
        for (const order of orders) {
          for (const orderedProduct of order.products) {
            if (orderedProduct.product.toString() === product._id.toString()) {
              orderedProduct.product = DELETEDPRODUCT_ID;
            }
          }
  
          await order.save({ session });
        }
  
        // Update categories
        await updateCategories(products, "delete");
  
        // Delete the product
        await Product.deleteOne({ _id: product._id }).session(session);
  
        clearCache("deleteProduct", undefined);
      }
  
      // If cache is not kept, clear the catalog cache
      if (!cache) {
        await clearCatalogCache();
      } else {
        console.log("Catalog cache cleared.");
      }
  
      await session.commitTransaction();
      // console.log("Deleted products");
  
    } catch (error: any) {
      await session.abortTransaction();
      throw new Error(`Error deleting products: ${error.message}`);
    } finally {
      session.endSession();
    }
  }
  

export async function deleteProduct(id: { productId: string} | {product_id: string}, cache?: "keep-catalog-cache") {
  try {
    connectToDB();

    // console.log("Deleting")
    if(id){
        const productId = "productId" in id ? id.productId : id.product_id;
        const searchParam = "productId" in id ? "id" : "_id";

        let product;

        if(searchParam === "id") {
            product = await Product.findOne({ id: productId });
        } else if (searchParam === "_id") {
            product = await Product.findOne({ _id: productId });
        }

        // console.log("Product", product);
    
        if(product){
            
            const usersWhoLikedProduct = await User.find({ _id: { $in: product.likedBy }});
        
            if(!product) {
                throw new Error("Product not found");
            }
        
            //console.log("Liked by", usersWhoLikedProduct);
        
            if(usersWhoLikedProduct){
                for(const user of usersWhoLikedProduct) {
                    user.likes.pull(product._id);
            
                    await user.save();
                }
            }

            await updateCategories([product], "delete")
        
            const orders = await Order.find({ 'products.product': product._id })

            for(const order of orders) {
                for(const orderedProduct of order.products) {
                    orderedProduct.product = DELETEDPRODUCT_ID;

                    //console.log("Product", orderedProduct)
                }

                
                await order.save();
            }

            if(searchParam === "id") {
                await Product.deleteOne({ id: productId });
            } else if(searchParam === "_id") {
                await Product.deleteOne({ _id: productId })
            }
        
            if(!cache){
                await clearCatalogCache();
            } else {
                console.log("Catalog cache cleared.");
            }
            
            clearCache("deleteProduct", undefined)
        }
    }
  } catch (error: any) {
    throw new Error(`Error deleting product: ${id} ${error.message}`)
  }
}

type ParamDifference = {
  [paramName: string]: Array<{ _id: string; value: string }>;
};

const getFirstTwoWordsCombined = (name: string): string => {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return parts[0] + parts[1];
  }
  return parts[0] || "";
};

const getProductGroupKey = (product: ProductType): string => {
  const { articleNumber, name, params, category } = product;

  if (typeof articleNumber !== "string" || typeof name !== "string" || !Array.isArray(params) || !Array.isArray(category)) {
      return '';
  }

  const articleParts = articleNumber.split("-");
  const baseArticleNumber = articleParts.length > 0 ? articleParts[0] : '';

  const firstTwoWordsOfName = getFirstTwoWordsCombined(name);

  const colorParam = params.find(p => ["Колір", "колір", "Color", "color", "Colour", "color"].includes(p.name));
  const colorValue = colorParam ? colorParam.value : "no_color";

  const categoryIds = category.map(cat => typeof cat === 'string' ? cat : cat._id);
  const sortedCategories = [...categoryIds].sort().join(',');

  return `${baseArticleNumber}::${firstTwoWordsOfName}::${colorValue}::${sortedCategories}`;
};

export async function fetchProductAndRelevantParams(
  currentProductId: string,
  key?: keyof ProductType,
  splitChar?: string,
  index?: number,
): Promise<{ product: ProductType; selectParams: ParamDifference }> {
  try {
    connectToDB();

    const currentProduct: any = await Product.findById(currentProductId).populate({
      path: "category",
      model: Category,
      select: "_id name"
    });

    if (!currentProduct) {
      throw new Error("Current product not found");
    }

    const currentProductCombinedName: string = getFirstTwoWordsCombined(currentProduct.name);

    const similarProducts: ProductType[] = await Product.find({
        _id: { $ne: currentProductId },
        isAvailable: true,
        $expr: {
            $eq: [
                {
                    $concat: [
                        { $arrayElemAt: [{ $split: ["$name", " "] }, 0] },
                        { $ifNull: [{ $arrayElemAt: [{ $split: ["$name", " "] }, 1] }, ""] }
                    ]
                },
                currentProductCombinedName
            ]
        }
    });

    const currentProductGroupKey: string = getProductGroupKey(currentProduct);

    const allCandidateProducts: ProductType[] = [currentProduct, ...similarProducts];

    const productsInCurrentGroup: ProductType[] = allCandidateProducts.filter((p: ProductType) => {
        return p.isAvailable && getProductGroupKey(p) === currentProductGroupKey;
    });

    const paramCounts: Record<string, Set<string>> = {};

    for (const product of productsInCurrentGroup) {
      if (product.params && Array.isArray(product.params)) {
        for (const param of product.params) {
          if (!paramCounts[param.name]) {
            paramCounts[param.name] = new Set<string>();
          }
          paramCounts[param.name].add(param.value);
        }
      }
    }
    
    const paramDifferences: ParamDifference = {};
    
    const allowedParams: string[] = ["Розмір", "розмір", "Size", "size"];

    for (const [paramName, values] of Object.entries(paramCounts)) {
      if (values.size > 1 && allowedParams.includes(paramName)) {
          paramDifferences[paramName] = Array.from(values).map((value: string) => ({
              _id: productsInCurrentGroup.find((p: ProductType) =>
                  p.params?.some((param: { name: string, value: string}) => param.name === paramName && param.value === value)
              )?._id.toString() || currentProduct._id.toString(),
              value,
          }));
      }
    }
  
    return {
      product: currentProduct,
      selectParams: paramDifferences,
    };
  } catch (error: any) {
    throw new Error(`Error fetching product and its select params: ${error.message}`);
  }
}


export async function fetchPreviewProduct({ param }: { param: string }): Promise<ProductType>;
export async function fetchPreviewProduct({ param }: { param: string }, type: 'json'): Promise<string>;

export async function fetchPreviewProduct({ param }: { param: string }, type?: 'json') {
   try {
    connectToDB();

    // TODO: Update
    const [categories, paramName] = param.split("&");

    const products = await Product.find({
      category: { $in: categories },
      params: {
        $elemMatch: { name: paramName }
      }
    });

    if(type === 'json'){
      return JSON.stringify(products[0])
    } else {
      return products[0]
    }
   } catch (error: any) {
     throw new Error(`Error finding preview product: ${error.message}`)
   }
}

// export async function findProductCategories({ productId }: { productId: string }): Promise<CategoryType[]>;
// export async function findProductCategories({ productId }: { productId: string }, type: 'json'): Promise<string>;

// export async function findProductCategories({ productId }: { productId: string }, type?: 'json') {
//    try {
      
//     if(type === 'json'){
//       return JSON.stringify(params)
//     } else {
//       return params
//     }
//    } catch (error: any) {
//      throw new Error(`${error.message}`)
//    }
// }

export async function fetchPurchaseNotificationsInfo(): Promise<{ id: string, name: string, image: string }[]> {
  try {
    await connectToDB();

    const products = await Product.find({_id: {$ne: DELETEDPRODUCT_ID}, isAvailable: true, quantity: { $gt: 0 }})

    return products.map(p => ({ id: p._id.toString(), name: pretifyProductName(p.name, [], p.articleNumber || "", 0), image: p.images[0] }))
  } catch (error: any) {
    throw new Error(`Error finding purchase notifications info: ${error.message}`)
  }
}

export async function getProductPageUrlByFirstImageUrl(image: string): Promise<string> {
  try {
    const product = await Product.findOne({images: image});

    const id = product._id

    return id.toString()
  } catch (error: any) {
    throw new Error(`Error getting product page url by url: ${error.message}`)
  }
}

export async function getTop3ProductsBySales(): Promise<ProductType[]>;
export async function getTop3ProductsBySales(type: 'json'): Promise<string>;

export async function getTop3ProductsBySales(type?: 'json') {
   try {
    await connectToDB();

    const topProducts = await Product.aggregate([
      {
        $addFields: {
          salesCount: { $size: { $ifNull: ["$orderedBy", []] } }
        }
      },
      { $sort: { salesCount: -1 } },
      { $limit: 3 }
    ]);

    if(type === 'json'){
      return JSON.stringify(topProducts)
    } else {
      return topProducts
    }
   } catch (error: any) {
     throw new Error(`Error getting top 3 products: ${error.message}`)
   }
}
export async function leaveReview(params: { productId: string, userId: string | undefined, name: string, email: string, text: string, rating: number, attachmentsUrls: string[] }) {
  try {

    await connectToDB();

    const date = new Date()

    const formattedDate = new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)

    const product = await Product.findByIdAndUpdate(
      params.productId,
      {
        $push: { reviews: { user: params.name, rating: params.rating, text: params.text, attachmentsUrls: params.attachmentsUrls, time: formattedDate }}
      }
    )

    let promo = ""

    if(params.userId) {
      promo = await addPromo({ userId: params.userId, email: params.email })
    }

    await clearCatalogCache();

    await clearCache("updateProduct", params.productId)
    return promo
  } catch (error: any) {
    throw new Error(`Error adding review to the product: ${error.message}`)
  }
}

export const applyDiscountToProduct = async ({
  productId,
  percentage,
  direction,
}: {
  productId: string;
  percentage: number;
  direction: "Зменшити" | "Збільшити";
}): Promise<void> => {
  if (!productId || typeof percentage !== 'number' || percentage < 0) {
    throw new Error('Invalid input: productId and a non-negative percentage are required.');
  }
  if (direction !== "Зменшити" && direction !== "Збільшити") {
    throw new Error('Invalid direction: Must be "Зменшити" or "Збільшити".');
  }

  await connectToDB();

  let factor: number;
  if (direction === "Зменшити") {
    factor = 1 - percentage / 100;
  } else {
    factor = 1 + percentage / 100;
  }

  if (factor < 0) {
    factor = 0;
  }

  await Product.findByIdAndUpdate(
    productId,
    [
      {
        $set: {
          price: { $round: [{ $multiply: ['$price', factor] }, 0] },
          priceToShow: { $round: [{ $multiply: ['$priceToShow', factor] }, 0] }
        }
      }
    ],
  );
};

export async function fetchProductsLength() {
  try {
    await connectToDB();

    const products = await Product.find().select("_id")


    return products.length
  } catch (error: any) {
    throw new Error(`${error.message}`)
  }
}