// app/(root)/info/public-offer/page.tsx
import fs from 'fs';
import path from 'path';
import InfoPageLayout from "@/components/layout/InfoPageLayout"; // Assuming this component exists

// This page is a Server Component, allowing it to use Node.js modules like 'fs'

export default function PublicOfferPage() {
  const markdownPath = path.join(process.cwd(), 'app/(root)/info/public-offer', 'public-offer.md');
  let markdownContent = '';

  try {
    // Read the Markdown file content synchronously
    markdownContent = fs.readFileSync(markdownPath, 'utf-8');
  } catch (error) {
    console.error("Error reading public-offer.md:", error);
    markdownContent = "# 404: Документ не знайдено";
  }

  // The InfoPageLayout component (assumed to be a Client Component)
  // will handle the actual rendering of the markdown string to HTML.
  return (
    <InfoPageLayout
      title="Публічна оферта"
      markdownContent={markdownContent}
    />
  );
}