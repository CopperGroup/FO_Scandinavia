import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
    },
    id: {
        type: String,
    },
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        }
    ],
    totalValue: {
        type: Number
    },
    subCategories: [
        {
            type: mongoose.Schema.Types.ObjectId
        }
    ],
    // A few sentences shown under the products on the category's page in the shop.
    text: {
        type: String
    }
})

categorySchema.index({ id: 1 });

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);

export default Category;