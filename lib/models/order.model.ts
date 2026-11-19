import mongoose, { InferSchemaType } from "mongoose";

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

    warehouse: {
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
    },

    invoiceString: {
        type: String
    },

    // Waybill bookkeeping for the "Доставка" admin page.
    invoiceCreatedAt: Date,
    /** Last tracking status text from Nova Poshta, and when it was read. */
    invoiceStatus: String,
    invoiceStatusCode: String,
    invoiceCheckedAt: Date,

    isFreeDelivery: {
        type: Boolean,
        default: false
    },

    /**
     * A test order (the shop trying its own checkout). Kept, but left out of every list,
     * count and statistic, the customer's account and the bestseller order; the admin
     * finds it under «Тестові» on the orders page and can take the mark off.
     */
    isTest: {
        type: Boolean,
        default: false
    }
});

// The public order number. Unique: createOrder retries on a clash.
orderSchema.index({ id: 1 }, { unique: true })
// Dashboard and order lists read by date and by status.
orderSchema.index({ data: -1 })
orderSchema.index({ paymentStatus: 1, deliveryStatus: 1, data: -1 })
// Payments tabs: one payment status, newest first.
orderSchema.index({ paymentStatus: 1, data: -1 })
// Orders tabs and the "new orders" badge counted on every admin navigation.
orderSchema.index({ deliveryStatus: 1, data: -1 })
// A customer's orders (profile pages, "my orders").
orderSchema.index({ user: 1, data: -1 })
// Dashboard "new customers": earlier orders of the same address, any letter case.
orderSchema.index({ email: 1, data: 1 }, { name: "email_ci_data", collation: { locale: "en", strength: 2 } })
orderSchema.index({ "products.product": 1 })

/** Add to every order query that lists or counts real orders. Old orders have no field at all. */
export const REAL_ORDER = { isTest: { $ne: true } } as const;

type OrderType = InferSchemaType<typeof orderSchema> & { _id: string };

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;

export type { OrderType }
