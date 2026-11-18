import { createUploadthing, type FileRouter } from "uploadthing/server";
import { UploadThingError } from "uploadthing/server";
import { currentAdmin } from "@/lib/import/admin";

const f = createUploadthing();

// Uploads spend the store's UploadThing quota: only a signed-in Admin/Owner may upload.
export const ourFileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 10,
    },
  })
    .middleware(async () => {
      const admin = await currentAdmin();

      if (!admin) {
        throw new UploadThingError("Unauthorized");
      }

      return { userId: admin.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
