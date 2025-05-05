import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    id: {
        type: String,
    },

    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            },
            amount: {
                type: Number,
            }
        },
    ],

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    value: {
        type: Number
    },

    name: {
        type: String
    },

    surname: {
        type: String
    },

    phoneNumber: {
        type: String
    },

    email: {
        type: String
    },

    paymentType: {
        type: String
    },

    deliveryMethod: {
        type: String
    },

    city: {
        type: String
    },

    adress: {
        type: String
    },

    postalCode: {
        type: String
    },

    comment: {
        type: String
    },

    buildingNumber: {
        type: String
    },

    apartment: {
        type: String
    },

    // Nova Poshta-specific fields
    cityRef: {
        type: String
    },

    warehouseRef: {
        type: String
    },

    warehouseIndex: {
        type: String
    },

    streetRef: {
        type: String
    },

    // Stringified JSON invoice
    invoice: {
        type: String
    },

    data: {
        type: Date,
        default: Date.now
    },

    paymentStatus: {
        type: String
    },

    deliveryStatus: {
        type: String
    },

    promocode: {
        type: String
    },

    discount: {
        type: Number
    },

    emails: {
        askForReview: Boolean,
        confirmation: Boolean
    }
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
