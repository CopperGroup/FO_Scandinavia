import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true},
    images: [
        {
            type: String
        }
    ],
    isAvailable: {
        type: Boolean
    },
    quantity: {
        type: Number
    },
    url: {
        type: String
    },
    priceToShow: {
        type: Number
    },
    price: {
        type: Number
    },
    category: [
        {
            type: mongoose.Schema.Types.ObjectId
        }
    ],
    vendor: {
        type: String
    },
    description: {
        type: String
    },
    articleNumber: {
        type: String
    },
    params: [
        {
            name: {
                type: String,
                required: true
            },
            value: {
                type: String,
                required: true
            },
        }
    ],
    isFetched: {
        type: Boolean
    },
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    orderedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        }
    ],

    likedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],

    addedToCart: [
        {
            type: Date
        }
    ]

}, { timestamps: true })

// Lookups the catalog, the importer and the admin rely on.
productSchema.index({ id: 1 });
productSchema.index({ articleNumber: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isAvailable: 1, quantity: 1 });
productSchema.index({ isFetched: 1 });
productSchema.index({ likedBy: 1 });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;