"use client";

import { useEffect, useState, useRef } from "react";
import FilterCategoryList from "@/components/admin-components/Filter/FilterCategoryList";
import { fetchRawCategoriesForFilterConfig } from "@/lib/actions/categories.actions";
import { fetchFilter } from "@/lib/actions/filter.actions";
import { mergeFilterAndCategories } from "@/lib/utils";
import AdminLoading from "@/components/shared/AdminLoading";

interface RawCategoryFromDB {
  _id: string;
  name: string;
  products?: { params?: { name: string }[] }[];
  [key: string]: any;
}

interface CategoriesParams {
  [categoryId: string]: {
    name: string;
    totalProducts: number;
    params: { name: string; totalProducts: number; type: string }[];
  };
}

const MAX_CATEGORIES_PER_WORKER_FILTER = 50; // Example, adjust as needed

const Page = () => {
  const [stringifiedCategories, setStringifiedCategories] = useState("{}");
  const [filterDelayState, setFilterDelayState] = useState(250);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workersRef = useRef<Worker[]>([]);

  useEffect(() => {
    async function loadAndProcessData() {
      setIsLoading(true);
      setError(null);
      setStringifiedCategories("{}");

      try {
        const filterData = await fetchFilter();
        setFilterDelayState(filterData?.delay || 250);

        const rawCategoriesJson = await fetchRawCategoriesForFilterConfig();
        const allRawCategories: RawCategoryFromDB[] = JSON.parse(rawCategoriesJson);

        if (!allRawCategories || allRawCategories.length === 0) {
          if (filterData) {
             const emptyParamsForFilter = {};
             setStringifiedCategories(JSON.stringify(mergeFilterAndCategories(filterData, emptyParamsForFilter)));
          } else {
             setStringifiedCategories("{}");
          }
          setIsLoading(false);
          return;
        }
        
        workersRef.current.forEach(worker => worker.terminate());
        workersRef.current = [];

        const numChunks = Math.ceil(allRawCategories.length / MAX_CATEGORIES_PER_WORKER_FILTER);
        const promises: Promise<CategoriesParams>[] = [];
        
        for (let i = 0; i < numChunks; i++) {
          const chunkStart = i * MAX_CATEGORIES_PER_WORKER_FILTER;
          const chunkEnd = chunkStart + MAX_CATEGORIES_PER_WORKER_FILTER;
          const categoryChunk = allRawCategories.slice(chunkStart, chunkEnd);

          const promise = new Promise<CategoriesParams>((resolve, reject) => {
            const worker = new Worker(new URL('@/workers/filterCategoryProcessor.worker.ts', import.meta.url), {
              type: 'module'
            });
            workersRef.current.push(worker);

            worker.onmessage = (event: MessageEvent<CategoriesParams>) => {
              resolve(event.data);
              worker.terminate();
            };
            worker.onerror = (errEvent) => {
              console.error("Filter category worker error:", errEvent);
              reject(new Error(`Worker failed: ${errEvent.message}`));
              worker.terminate();
            };
            worker.postMessage(categoryChunk);
          });
          promises.push(promise);
        }

        const partialParamsResults = await Promise.all(promises);
        const aggregatedCategoriesParams: CategoriesParams = Object.assign({}, ...partialParamsResults);
        
        let finalDataForList: CategoriesParams | ReturnType<typeof mergeFilterAndCategories>;
        if (filterData) {
          finalDataForList = mergeFilterAndCategories(filterData, aggregatedCategoriesParams);
        } else {
          finalDataForList = aggregatedCategoriesParams;
        }

        setStringifiedCategories(JSON.stringify(finalDataForList));

      } catch (err: any) {
        console.error("Failed to load or process filter configuration data:", err);
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
        workersRef.current.forEach(worker => worker.terminate()); // Ensure cleanup
        workersRef.current = [];
      }
    }

    loadAndProcessData();

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
    <section className="px-10 py-20 w-full max-[360px]:px-4">
      <h1 className="text-heading1-bold drop-shadow-text-blue">Налаштування фільтру</h1>
      <FilterCategoryList stringifiedCategories={stringifiedCategories} filterDelay={filterDelayState} />
    </section>
  );
};

export default Page;