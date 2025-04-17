import type { Metadata } from 'next'
import ProductNotFound from '@/components/shared/ProductNotFound'
import { Store } from '@/constants/store'

export const metadata: Metadata = {
  title: `404 - ${Store.name}`,
  other: {
    isNotFoundPage: 'true',
  },
}

export default function NotFound() {
  return <ProductNotFound />
}
