"use client";

import React, { memo, Suspense, useEffect, useRef, useState, FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useAnimation, useInView } from "framer-motion"
import dynamic from "next/dynamic";
import DynamicIcon from "@/components/ui/dynamic-icon";

interface JSXRendererProps {
  jsxString: string;
  imports: Record<string, string>;
}

const componentCache = new Map<string, FC>(); // Cache compiled components
let globalWorker: Worker | null = null; // Singleton Worker

const getWorker = () => {
  if (!globalWorker) {
    globalWorker = new Worker(new URL("@/workers/jsxWorker", import.meta.url), {
      type: "module",
    });
  }
  return globalWorker;
};

const importedComponentsRef: Record<string, FC> = {};

// Preload common UI components to avoid async rendering delays
const preloadComponents = (imports: Record<string, string>) => {
  Object.entries(imports).forEach(([name, path]) => {
    if (!importedComponentsRef[name]) {
    // @ts-ignore
      importedComponentsRef[name] = dynamic(
        () => import(`@/components/ui/${path}`).then((module) => ({ default: module[name] })),
        { ssr: false }
      );
    }
  });
};

const JSXRenderer: FC<JSXRendererProps> = memo(({ jsxString, imports }) => {
  const [Component, setComponent] = useState<FC | null>(null);

  useEffect(() => {
    preloadComponents(imports);
  }, [imports]);

  useEffect(() => {
    if (typeof window === "undefined") return;
  
    // Remove the lastJSXString check so it always re-renders
    if (componentCache.has(jsxString)) {
      setComponent(() => componentCache.get(jsxString)!);
      return;
    }
  
    const worker = getWorker();
  
    worker.onmessage = (event: MessageEvent) => {
      const { compiledCode, error } = event.data;
      if (error) {
        console.error("Worker error:", error);
        return;
      }
      try {
        const DynamicComponent = new Function(
          "React",
          "useState",
          "useEffect",
          "useRef",
          "Image",
          "Link",
          "motion",
          "useAnimation",
          "useInView",
          "DynamicIcon",
          ...Object.keys(importedComponentsRef),
          `return ${compiledCode}`
        )(React, useState, useEffect, useRef, Image, Link, motion, useAnimation, useInView, DynamicIcon, ...Object.values(importedComponentsRef));
  
        componentCache.set(jsxString, DynamicComponent);
        setComponent(() => DynamicComponent);
      } catch (err) {
        console.error("Error constructing component:", err);
      }
    };
  
    worker.postMessage({ jsxString, imports });
  
    return () => {
      worker.onmessage = null; // Clean up
    };
  }, [jsxString, imports]);
  

  if (!Component) return <p>Loading...</p>;

  return (
    <Suspense fallback={<div className="animate-pulse bg-gray-300 h-10 w-full rounded-md" /> }>
      <Component />
    </Suspense>
  );
});

JSXRenderer.displayName = "JSXRenderer";

export default JSXRenderer;
