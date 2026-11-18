import mongoose from "mongoose";

/**
 * Texts of the storefront changed in the admin panel ("Сторінки"): one
 * document per page of lib/content/schema.ts. A page that was never edited
 * has no document and shows its defaults.
 */
const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    values: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, default: "" },
    // What the page editor holds right now; only its preview frame sees it.
    draft: { type: mongoose.Schema.Types.Mixed },
    draftAt: Date,
  },
  { timestamps: true, minimize: false },
);

const SiteContent = mongoose.models.SiteContent || mongoose.model("SiteContent", siteContentSchema);

export default SiteContent;
