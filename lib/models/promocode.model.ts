import mongoose from "mongoose";

/**
 * A promo code (lib/promo/rules.ts has the rules, lib/promo/server.ts the reads and writes).
 *
 * `uses` is the record of every order the code was used on. A use is taken
 * with one conditional update when the order is placed, so two orders cannot
 * share the last use, and it is given back when the order is cancelled.
 */
const useSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  /** The order's number (Order.id); null for the moment between taking the use and creating the order. */
  order: { type: String, default: null },
  at: { type: Date, default: Date.now },
});

const promoCodeSchema = new mongoose.Schema(
  {
    /** As customers type it, in capitals. */
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    percent: { type: Number, required: true, min: 1, max: 99 },
    /** The customer a personal code belongs to; null for a shared code. */
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    /** First and last day the code works, "YYYY-MM-DD" in Kyiv; null: no limit on that side. */
    startDay: { type: String, default: null },
    endDay: { type: String, default: null },
    maxUses: { type: Number, default: null },
    perCustomer: { type: Number, default: 1, min: 1 },
    minOrder: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    note: { type: String, default: "" },
    /** Who made it: the shop by hand, or the shop by itself for registering or for a review; "legacy" came from the old format. */
    source: { type: String, enum: ["admin", "welcome", "review", "legacy"], default: "admin" },
    uses: { type: [useSchema], default: [] },
    usedCount: { type: Number, default: 0 },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true },
);

promoCodeSchema.index({ "uses.order": 1 }, { sparse: true });

const PromoCode = mongoose.models.PromoCode || mongoose.model("PromoCode", promoCodeSchema);

export default PromoCode;
