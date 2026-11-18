import { notFound } from "next/navigation"

/**
 * Catches every address no other page answers and hands it to not-found.tsx
 * of the storefront, so a mistyped link still gets the header, the search
 * and a way back, with a 404 status.
 */
export default function Missing() {
  notFound()
}
