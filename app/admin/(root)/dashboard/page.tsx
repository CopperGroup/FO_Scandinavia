import Dashboard from "@/components/admin-components/Dashboard"
import { getDashboardData } from "@/lib/actions/order.actions"

const Page = async () => {
  const dashboardData = await getDashboardData()

  return (
    <section className="w-full px-5 py-10 pt-3 max-[420px]:px-2">
      <Dashboard stringifiedData={JSON.stringify(dashboardData)} />
    </section>
  )
}

export default Page

