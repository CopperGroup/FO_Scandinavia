import ReactMarkdown from "react-markdown"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"

interface InfoPageLayoutProps {
  title: string
  markdownContent: string
  /** Marks the text for the page editor's preview (data-edit). */
  edit?: string
}

/** Long-form legal pages written in Markdown (public offer, privacy policy). */
export default function InfoPageLayout({ title, markdownContent, edit }: InfoPageLayoutProps) {
  // The page already has its title; the document's own first heading would repeat it.
  const body = markdownContent.replace(/^\s*#\s+.*\r?\n/, "")

  return (
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={[{ label: title }]} />
      <h1 className="heading-display mt-3 text-2xl sm:text-3xl">{title}</h1>
      <div data-edit={edit} className="rich-text mt-6 max-w-[72ch]">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
    </div>
  )
}
