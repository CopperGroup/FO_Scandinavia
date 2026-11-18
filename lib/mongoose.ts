import mongoose from "mongoose";

type ConnectionCache = { promise: Promise<typeof mongoose> | null };

// Kept on globalThis so hot reloads and separate route bundles share one pool.
const globalForMongoose = globalThis as unknown as { __mongooseConnection?: ConnectionCache };
const cached: ConnectionCache = (globalForMongoose.__mongooseConnection ??= { promise: null });

/**
 * Opens the MongoDB connection once and reuses it. Safe to call (and to not
 * await) on every request: concurrent callers share the same promise and
 * Mongoose buffers queries until the connection is ready.
 */
export async function connectToDB(): Promise<void> {
  const url = process.env.MONGODB_URL;
  if (!url) {
    console.error("[db] MONGODB_URL is not set");
    return;
  }

  if (mongoose.connection.readyState === 1) return;

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose
      .connect(url, { maxPoolSize: 10, serverSelectionTimeoutMS: 15000 })
      .catch((error) => {
        // Drop the failed attempt so the next call retries instead of reusing a rejection.
        cached.promise = null;
        throw error;
      });
  }

  try {
    await cached.promise;
  } catch (error) {
    console.error("[db] connection failed:", error instanceof Error ? error.message : error);
  }
}
