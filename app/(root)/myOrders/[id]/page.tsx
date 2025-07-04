import OrderPage from "@/components/shared/OrderPage";
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

    const order = await fetchOrder({ orderId: params.id });

    // console.log("Order", order);
    
    return (
        <section className="-mt-32 px-10 py-20 w-full max-[1100px]:pb-5 max-[425px]:px-0">
            <OrderPage orderJson={JSON.stringify(order)}/>
        </section>
    )
}

export default Page;