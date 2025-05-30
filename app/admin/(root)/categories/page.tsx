"use client";

import { useEffect, useState, useRef } from "react";
import CategoryCardList from "@/components/admin-components/Categories/CategoriesList";
import { Category } from "@/lib/types/types";
import { fetchRawCategoriesJSON } from "@/lib/actions/categories.actions";
import AdminLoading from "@/components/shared/AdminLoading";

interface RawCategoryFromDB { // Represents the structure after JSON.parse from server
  _id: string;
  name: string;
  totalValue?: number;
  products?: any[]; // Define more strictly if possible, e.g., RawProduct[]
  [key: string]: any;
}

const MAX_CATEGORIES_PER_WORKER = 50;

const Page = () => {
  const [processedCategories, setProcessedCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workersRef = useRef<Worker[]>([]);

  useEffect(() => {
    async function loadAndProcessCategories() {
      setIsLoading(true);
      setError(null);
      setProcessedCategories([]);

      try {
        const rawJsonString = await fetchRawCategoriesJSON();
        const rawDataArray: RawCategoryFromDB[] = JSON.parse(rawJsonString);

        if (!rawDataArray || rawDataArray.length === 0) {
          setIsLoading(false);
          return;
        }

        workersRef.current.forEach(worker => worker.terminate());
        workersRef.current = [];

        const numChunks = Math.ceil(rawDataArray.length / MAX_CATEGORIES_PER_WORKER);
        let resultsReceived = 0;
        const allProcessedChunks: Category[][] = new Array(numChunks);

        for (let i = 0; i < numChunks; i++) {
          const chunkStart = i * MAX_CATEGORIES_PER_WORKER;
          const chunkEnd = chunkStart + MAX_CATEGORIES_PER_WORKER;
          const categoryChunk = rawDataArray.slice(chunkStart, chunkEnd);
          
          const worker = new Worker(new URL('@/workers/categoryProcessor.worker.ts', import.meta.url), {
             type: 'module'
          });
          
          workersRef.current.push(worker);

          worker.onmessage = (event: MessageEvent<Category[]>) => {
            allProcessedChunks[i] = event.data;
            resultsReceived++;

            if (resultsReceived === numChunks) {
              const finalResult = allProcessedChunks.flat();
              setProcessedCategories(finalResult);
              setIsLoading(false);
              workersRef.current.forEach(w => w.terminate());
              workersRef.current = [];
            }
          };

          worker.onerror = (err) => {
            console.error("Worker error:", err);
            resultsReceived++;
            setError(prevError => prevError ? `${prevError}, Worker ${i} failed.` : `Worker ${i} failed: ${err.message}`);
            if (resultsReceived === numChunks) {
              const finalResult = allProcessedChunks.filter(Boolean).flat();
              setProcessedCategories(finalResult);
              setIsLoading(false);
              workersRef.current.forEach(w => w.terminate());
              workersRef.current = [];
            }
          };

          worker.postMessage(categoryChunk);
        }
      } catch (err: any) {
        console.error("Failed to fetch or process categories:", err);
        setError(err.message || "An unknown error occurred while loading categories.");
        setIsLoading(false);
      }
    }

    loadAndProcessCategories();

    return () => {
      workersRef.current.forEach(worker => worker.terminate());
      workersRef.current = [];
    };
  }, []);

  if (isLoading) {
    return (
      <section className="relative flex justify-center items-center px-10 py-20 w-full h-screen max-[360px]:px-4"> 
        <AdminLoading/>
      </section>
    );
  }
  return (
    <section className="w-full px-10 py-10 max-[360px]:px-4">
      <h1 className="w-full text-heading1-bold drop-shadow-text-blue">Категорії</h1>
      <CategoryCardList categories={processedCategories} />
    </section>
  );
};

export default Page;