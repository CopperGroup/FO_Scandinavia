import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String
    },
    name: {
        type: String,
    },
    surname: {
        type: String,
    },
    email: {
        type: String,
        required: [true, "Please provide a email"],
        unique: true,
    },
    phoneNumber: {
        type: String,
    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
    },
    orders: [
        {
            order: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Order'
            },
            createdAt: {
                type: Date,
            }
        }
    ],
    totalOrders: {
        type: Number,
        default: 0
    },
    favourite: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],
    discounts: [
        {
            type: String
        }
    ],
    role: {
        type: String,
        default: 'User',
    },
    selfCreated: {
        type: Boolean,
        default: false
    },
    // Products this customer already got a review reward for: one promo code per product.
    reviewedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    region: String,
    city: String,
    postalCode: String,
    street: String,
    isVerfied: {
        type: Boolean,
        default: true,
    },
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,
    verifyToken: String,
    verifyTokenExpiry: Date,
    // A registration on a guest record that waits for the e-mail to be confirmed
    // (lib/auth/accounts.ts). Nothing here is active until the link is opened.
    claim: {
        tokenHash: String,
        password: String,
        username: String,
        phoneNumber: String,
        expires: Date,
        sentAt: Date,
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],
})

// Case-insensitive lookups by address (login, layouts, checkout): see lib/auth/email.ts.
userSchema.index({ email: 1 }, { name: "email_ci", collation: { locale: "en", strength: 2 } })
// Reset and verification links look the account up by token; most accounts have none.
userSchema.index({ forgotPasswordToken: 1 }, { sparse: true })
userSchema.index({ verifyToken: 1 }, { sparse: true })
userSchema.index({ "claim.tokenHash": 1 }, { sparse: true })
// Admin client list: role filter, newest first.
userSchema.index({ role: 1, _id: -1 })

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;