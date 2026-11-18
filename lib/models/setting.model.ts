import mongoose from "mongoose";

/**
 * Settings the owner enters in the admin panel that must not be readable from
 * a copy of the database: API keys. `sealed` is the output of sealSecret()
 * (lib/secrets.ts); the plain value is never stored.
 *
 * They live in their own collection so that no code that loads the store
 * document can send one to the browser by accident.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    sealed: { type: String, required: true },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);

export default Setting;
