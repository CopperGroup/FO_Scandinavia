import { createUploadthing, type FileRouter } from "uploadthing/server";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Fake auth (replace with real auth later)
const auth = async (req: Request) => {
  return { id: "fakeId" };
};

export const ourFileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 10,
    },
  })
    .middleware(async ({ req }) => {
      const user = await auth(req);

      if (!user) {
        throw new UploadThingError("Unauthorized");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl, // ✅ useful on client
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
