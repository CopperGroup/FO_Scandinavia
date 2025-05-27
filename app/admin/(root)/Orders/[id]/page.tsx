import OrderPage from "@/components/admin-components/OrderPage";
import { fetchOrder } from "@/lib/actions/order.actions";

interface Product {
    product: {
        id: string;
        name: string;
        images: string[];
        priceToShow: number;
        params: {
            name: string;
            value: string;
        } []
    },
    amount: number
}
const Page = async ({ params }: { params: { id: string } }) => {
    if(!params.id) return null;

    const order = await fetchOrder({ orderId: params.id }, "json");

    //console.log(order.products);

    return (
        <section className="px-10 py-20 w-full max-[1100px]:pb-5">
            <OrderPage orderJson={order}/>
        </section>
    )
}

export default Page;