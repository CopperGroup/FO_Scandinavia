// app/(root)/info/conf-policy/page.tsx
import fs from 'fs';
import path from 'path';
import InfoPageLayout from "@/components/layout/InfoPageLayout"; // Assuming this component exists

// This page is a Server Component, allowing it to use Node.js modules like 'fs'

export default function ConfPolicyPage() {
  const markdownPath = path.join(process.cwd(), 'app/(root)/info/conf-policy', 'conf-policy.md');
  let markdownContent = '';
  
  try {
    // Read the Markdown file content synchronously
    markdownContent = fs.readFileSync(markdownPath, 'utf-8');
  } catch (error) {
    console.error("Error reading conf-policy.md:", error);
    markdownContent = "# 404: Документ не знайдено";
  }

  // The InfoPageLayout component (assumed to be a Client Component) 
  // will handle the actual rendering of the markdown string to HTML.
  return (
    <InfoPageLayout
      title="Політика конфіденційності"
      markdownContent={markdownContent}
    />
  );
}