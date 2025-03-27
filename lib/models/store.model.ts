import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
    pages: [
        {
            name: String,
            settings: String
        }
    ]
})

const Store = mongoose.models.Store || mongoose.model("Store", storeSchema);

export default Store;