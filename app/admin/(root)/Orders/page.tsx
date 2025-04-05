'use server'

import React from 'react'
import { fetchOrders } from '@/lib/actions/order.actions'
import Orders from './Orders'

const Page = async () => {

  const orders = await fetchOrders();

  return (
    <section className="px-10 py-20 w-full max-[360px]:px-4">
      <h1 className="text-heading1-bold drop-shadow-text-blue">Замовлення</h1>
      
      <Orders orders={JSON.stringify(orders)} />
    </section>
  )
}

export default Page;