import mongoose, { InferSchemaType } from "mongoose";

const pageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Page must have a name"]
    },
    dataInputs: [
        {
            name: String,
            value: String
        }
    ]

})

type PageType = InferSchemaType<typeof pageSchema> & { _id: string };

const Page = mongoose.models.Page || mongoose.model("Page", pageSchema);

export default Page;

export type { PageType }