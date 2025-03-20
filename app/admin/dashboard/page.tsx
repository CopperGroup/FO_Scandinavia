import Dashboard from "@/components/admin-components/Dashboard"
import { getDashboardData } from "@/lib/actions/order.actions";
import { sleep } from "@/lib/utils";

const Page = async () => {
    const dashboardData = await getDashboardData();
    
    return (
        <section className="w-full px-5 py-10 max-[420px]:px-0"> 
            <Dashboard stringifiedData={JSON.stringify(dashboardData)}/>
        </section>
    )
}

export default Page;