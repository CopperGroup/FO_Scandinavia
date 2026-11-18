import Link from "next/link"
import ReactMarkdown from "react-markdown"

/**
 * Text written in the admin with simple marks (Markdown): paragraphs, lists,
 * headings, links. Raw HTML in the text is not rendered, and links to pages of
 * the shop go through the router. The look comes from `className`
 * (".rich-text" on the storefront).
 */
export default function RichText({ text, className = "rich-text" }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a({ href, children }) {
            const target = String(href ?? "")
            if (target.startsWith("/")) return <Link href={target}>{children}</Link>
            return (
              <a href={target} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
