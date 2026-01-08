"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"

// REMOVED: import { useToast } from "@/hooks/use-toast"
import { toast } from "sonner" // ADDED: Import toast from sonner

import {
  addInvoiceString,
  calculateDeliveryCost,
  createCounterParty,
  createCounterPartyContact,
  generateInvoice,
  getInvoiceDetails,
  updateOrder, // Assuming updateOrder is ready to be called
} from "@/lib/actions/order.actions"
import { fetchProducts } from "@/lib/actions/product.actions"
import { TooltipProvider } from "@/components/ui/tooltip"

import { NovaPoshtaModal } from "./orders/SenderWarehouseSelect"
import OrderHeader from "./orders/order-page/OrderHeader"
import OrderStatusCards from "./orders/order-page/OrderStatusCards"
import OrderTabs from "./orders/order-page/OrderTabs"
import AddProductsModal from "./orders/order-page/AddProductsModal"

// --- Interfaces (Ideally, these would be in a separate, shared types file) ---
interface Product {
  product: {
    _id: string
    id: string
    name: string
    images: string[]
    priceToShow: number
    articleNumber: string
    params: {
      name: string
      value: string
    }[]
  }
  amount: number
}

interface AvailableProduct {
  _id: string
  id: string
  vendor: string
  name: string
  isAvailable: boolean
  price: number
  priceToShow: number
  category: string
  articleNumber: string
}

interface BasicInvoiceInfo {
  Ref: string
  CostOnSite: number | string
  EstimatedDeliveryDate: string
  IntDocNumber: string
  TypeDocument: string
}

interface DetailedInvoiceInfo {
  Number: string
  StatusCode: string
  DateCreated: string
  Status: string
  RefEW: string
  RecipientDateTime: string
  CargoType: string
  CargoDescriptionString: string
  DocumentCost: string
  AnnouncedPrice: number
  DocumentWeight: number
  CheckWeight: number
  CalculatedWeight: string
  CheckWeightMethod: string
  FactualWeight: string
  VolumeWeight: string
  SeatsAmount: string
  ServiceType: string
  CitySender: string
  CounterpartySenderDescription: string
  PhoneSender: string
  SenderAddress: string
  WarehouseSender: string
  CityRecipient: string
  CounterpartyRecipientDescription: string
  PhoneRecipient: string
  RecipientAddress: string
  RecipientFullName: string
  WarehouseRecipient: string
  WarehouseRecipientAddress: string
  PayerType: string
  PaymentMethod: string
  ScheduledDeliveryDate: string
  ActualDeliveryDate: string
  DateScan: string
  TrackingUpdateDate: string
  Redelivery: number
  RedeliverySum: string
  [key: string]: any
}

interface OrderData {
  _id: string
  id: string
  name: string
  surname: string
  adress: string
  city: string
  postalCode: string
  deliveryMethod: string
  paymentType: string
  phoneNumber: string
  email: string
  comment: string
  products: Product[]
  value: number
  paymentStatus: "Pending" | "Declined" | "Success"
  deliveryStatus: "Proceeding" | "Indelivery" | "Canceled" | "Fulfilled"
  promocode?: string
  discount?: string
  invoice?: string
  data: string
  warehouse?: string
  isFreeDelivery?: boolean
}
// --- End Interfaces ---

export default function OrderPage({ orderJson }: { orderJson: string }) {
  // Convert order from prop to state
  const initialOrderData: OrderData = JSON.parse(orderJson);
  const [order, setOrder] = useState<OrderData>(initialOrderData);

  // REMOVED: const { toast } = useToast();
  const searchParams = useSearchParams();

  // Main Order States
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // For saving edited order data

  // Order Details - Initialize with data from the 'order' state
  const [editedProducts, setEditedProducts] = useState<Product[]>(order.products);
  const [editedUserData, setEditedUserData] = useState({
    name: order.name,
    surname: order.surname,
    phoneNumber: order.phoneNumber,
    email: order.email,
    city: order.city,
    adress: order.adress,
    comment: order.comment,
    warehouse: order.warehouse || "",
  });

  // Invoice States
  const [parsedInvoice, setParsedInvoice] = useState<BasicInvoiceInfo | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isLoadingInvoiceDetails, setIsLoadingInvoiceDetails] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<DetailedInvoiceInfo | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isNovaPoshtaModalOpen, setIsNovaPoshtaModalOpen] = useState(false);
  const [invoiceStringInput, setInvoiceStringInput] = useState(initialOrderData.invoiceString);
  const [isSubmittingInvoiceString, setIsSubmittingInvoiceString] = useState(false);

  // Add Products Modal States (for child component)
  const [isAddProductsModalOpen, setIsAddProductsModalOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Infinite Scrolling for Add Products Modal
  const PRODUCTS_PER_PAGE = 20;
  const [displayedProductsCount, setDisplayedProductsCount] = useState(PRODUCTS_PER_PAGE);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const productListRef = useRef<HTMLDivElement>(null); // Ref for the scrollable product list

  // --- Effects ---

  // Parse invoice if it exists on initial load or if 'order.invoice' changes
  useEffect(() => {
    if (order.invoice) {
      try {
        setParsedInvoice(JSON.parse(order.invoice));
      } catch (e) {
        console.error("Failed to parse invoice:", e);
        toast.error("Помилка: Не вдалося розпарсити дані накладної."); // Sonner error toast
        setParsedInvoice(null); // Ensure it's null on parsing error
      }
    } else {
      setParsedInvoice(null); // Clear parsed invoice if it no longer exists
    }
  }, [order.invoice]);

  // Open invoice tab if specified in URL params
  useEffect(() => {
    const openInvoice = searchParams.get("openInvoice");
    if (openInvoice === "true" && order.invoice) {
      setActiveTab("invoice");
    }
  }, [searchParams, order.invoice]);

  // Fetch detailed invoice info when invoice tab is active and data is not loaded
  useEffect(() => {
    if (activeTab === "invoice" && parsedInvoice && !invoiceDetails && !isLoadingInvoiceDetails) {
      setIsLoadingInvoiceDetails(true);
      setInvoiceError(null);
      getInvoiceDetails(parsedInvoice.IntDocNumber)
        .then((details) => {
          setInvoiceDetails(details);
        })
        .catch((error) => {
          console.error("Failed to fetch invoice details:", error);
          setInvoiceError("Не вдалося завантажити деталі накладної. Спробуйте пізніше.");
          toast.error("Не вдалося завантажити деталі накладної"); // Sonner error toast
        })
        .finally(() => {
          setIsLoadingInvoiceDetails(false);
        });
    }
  }, [activeTab, parsedInvoice, invoiceDetails, isLoadingInvoiceDetails]); // Removed 'toast' from dependencies as sonner's toast is not a state/prop

  // Load available products for the AddProductsModal when it opens
  useEffect(() => {
    if (isAddProductsModalOpen) {
      setIsLoadingProducts(true);
      fetchProducts()
        .then((productsJson) => {
          const products = JSON.parse(productsJson) as AvailableProduct[];
          setAvailableProducts(products); // Store all fetched products
          // Apply initial filter based on current search query
          const initialFiltered = products.filter(
            (product) =>
              product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.vendor.toLowerCase().includes(searchQuery.toLowerCase()),
          );
          setDisplayedProductsCount(PRODUCTS_PER_PAGE); // Reset count for new search/open
          setHasMoreProducts(initialFiltered.length > PRODUCTS_PER_PAGE);
        })
        .catch((error) => {
          console.error("Failed to fetch products:", error);
          toast.error("Не вдалося завантажити список товарів"); // Sonner error toast
        })
        .finally(() => {
          setIsLoadingProducts(false);
        });
    } else {
      // Reset modal-specific states when modal closes
      setSearchQuery("");
      setAvailableProducts([]);
      setDisplayedProductsCount(PRODUCTS_PER_PAGE);
      setHasMoreProducts(true);
    }
  }, [isAddProductsModalOpen]); // Removed 'toast' from dependencies

  // Filter products based on search query (filters from already fetched `availableProducts`)
  const filteredAvailableProducts = availableProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.vendor.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Infinite scrolling logic for the product modal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreProducts && !isLoadingProducts) {
          setDisplayedProductsCount((prevCount) => prevCount + PRODUCTS_PER_PAGE);
        }
      },
      { threshold: 0.1 }, // Trigger when 10% of the target is visible
    );

    const currentRef = productListRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMoreProducts, isLoadingProducts]);

  // --- Handlers (Passed down to child components) ---

  const handleGenerateInvoice = async () => {
    setIsNovaPoshtaModalOpen(true);
  };

  const handleGenerateInvoiceWithLocation = async (cityRef: string, warehouseRef: string) => {
    setIsGeneratingInvoice(true);
    try {
      const counterPartyRef = await createCounterParty({ stringifiedOrder: orderJson });
      const counterPartyContact = await createCounterPartyContact({ stringifiedOrder: orderJson, ref: counterPartyRef });
      const deliveryCost = await calculateDeliveryCost({ stringifiedOrder: orderJson, senderCityRef: cityRef });
      const result = await generateInvoice({
        stringifiedOrder: orderJson,
        counterPartyRef,
        contactRef: counterPartyContact,
        deliveryCost,
        senderCityRef: cityRef,
        senderWarehouseRef: warehouseRef,
      });
      // Update the main order state's invoice string
      setOrder(prevOrder => ({ ...prevOrder, invoice: JSON.stringify({ IntDocNumber: result.IntDocNumber, Ref: result.Ref, CostOnSite: result.CostOnSite, EstimatedDeliveryDate: result.EstimatedDeliveryDate, TypeDocument: result.TypeDocument }) }));
      
      await addInvoiceString({ orderId: order._id, invoiceString: result.IntDocNumber });
      toast.success(`Накладну №${result.IntDocNumber} успішно сформовано`); // Sonner success toast
      // No full page refresh needed, state update handles it
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error(`Не вдалося сформувати накладну.`); // Sonner error toast
      toast.error(`Відповідь нової пошти: "${error}"`)
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleInvoiceStringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceStringInput.trim()) {
      toast.error("Будь ласка, введіть номер накладної"); // Sonner error toast
      return;
    }
    setIsSubmittingInvoiceString(true);
    try {
      // Update the main order state's invoice string
      setOrder(prevOrder => ({ ...prevOrder, invoice: JSON.stringify({ IntDocNumber: invoiceStringInput.trim() }) })); // Simplified for demo
      
      await addInvoiceString({ orderId: order._id, invoiceString: invoiceStringInput.trim() });
      toast.success("Номер накладної збережено"); // Sonner success toast
      // No full page refresh needed, state update handles it
    } catch (error) {
      console.error("Error saving invoice string:", error);
      toast.error("Не вдалося зберегти номер накладної. Спробуйте ще раз."); // Sonner error toast
    } finally {
      setIsSubmittingInvoiceString(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel editing - reset to original values from current 'order' state
      setEditedProducts(order.products);
      setEditedUserData({
        name: order.name,
        surname: order.surname,
        phoneNumber: order.phoneNumber,
        email: order.email,
        city: order.city,
        adress: order.adress,
        comment: order.comment,
        warehouse: order.warehouse || "",
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Products data in the requested format (only _id and amount)
      const productsDataForBackend = editedProducts.map(item => ({
        product: item.product._id, // Only the ObjectId string
        amount: item.amount,
      }));

      // User data, including the new warehouse field
      const userDataForBackend = {
        name: editedUserData.name,
        surname: editedUserData.surname,
        phoneNumber: editedUserData.phoneNumber,
        email: editedUserData.email,
        city: editedUserData.city,
        adress: editedUserData.adress,
        comment: editedUserData.comment,
        warehouse: editedUserData.warehouse, // Include edited warehouse
      };

      const updatedOrderDocument = await updateOrder({
        orderId: order._id,
        userData: userDataForBackend,
        productsData: productsDataForBackend,
      });
      // Assuming updateOrder returns the JSON string of the updated document
      setOrder(JSON.parse(updatedOrderDocument)); // Set the entire updated document from the backend

      toast.success("Замовлення успішно оновлено"); // Sonner success toast
      setIsEditMode(false);
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error(`Не вдалося зберегти зміни: ${error instanceof Error ? error.message : String(error)}`); // Sonner error toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedProducts = [...editedProducts];
    updatedProducts[index].amount = newQuantity;
    setEditedProducts(updatedProducts);
  };

  const handleDeleteProduct = (index: number) => {
    const updatedProducts = editedProducts.filter((_, i) => i !== index);
    setEditedProducts(updatedProducts);
  };

  const handleAddProduct = (product: AvailableProduct) => {
    const newProduct: Product = {
      product: {
        _id: product._id,
        id: product.id,
        name: product.name,
        images: [],
        priceToShow: product.priceToShow,
        articleNumber: product.articleNumber,
        params: [],
      },
      amount: 1,
    };
    setEditedProducts([...editedProducts, newProduct]);
    toast.success(`${product.name} додано до замовлення`); // Sonner success toast
  };

  // --- Helper Functions (Could be moved to a utils file) ---
  const formatCurrency = (value: number) => {
    return (
      new Intl.NumberFormat("uk-UA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value) + " грн"
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return "—";
    try {
      const date = new Date(dateTimeString);
      return new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return dateTimeString;
    }
  };

  const getStatusColor = (statusCode: string) => {
    const code = Number.parseInt(statusCode, 10);
    if (code >= 9) return "text-emerald-600 font-medium";
    else if (code >= 5 && code <= 8) return "text-blue-600 font-medium";
    else if (code >= 2 && code <= 4) return "text-amber-600 font-medium";
    else if (code === 10 || code < 0) return "text-rose-600 font-medium";
    else return "text-gray-600";
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Success": return "bg-emerald-500";
      case "Pending": return "bg-amber-500";
      case "Declined": return "bg-rose-500";
      default: return "bg-gray-400";
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case "Fulfilled": return "bg-emerald-500";
      case "Indelivery": return "bg-blue-500";
      case "Proceeding": return "bg-amber-500";
      case "Canceled": return "bg-rose-500";
      default: return "bg-gray-400";
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "Success": return "Оплачено";
      case "Pending": return "Очікує оплати";
      case "Declined": return "Відхилено";
      default: return status;
    }
  };

  const getDeliveryStatusText = (status: string) => {
    switch (status) {
      case "Fulfilled": return "Доставлено";
      case "Indelivery": return "В дорозі";
      case "Proceeding": return "Підготовка";
      case "Canceled": return "Скасовано";
      default: return status;
    }
  };
  // --- End Helper Functions ---
  // Calculate original price if discount is applied
  const hasDiscount = order.discount && Number.parseFloat(order.discount) > 0;
  const discountPercentage = hasDiscount ? Number.parseFloat(order.discount) : 0;
  // Recalculate originalPrice based on current 'order.value'
  const originalPrice = hasDiscount ? order.value / (1 - discountPercentage / 100) : order.value;
  const discountAmount = hasDiscount ? originalPrice - order.value : 0;

  return (
    <TooltipProvider>
      <div className="bg-slate-50 min-h-screen">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-7xl">
          <OrderHeader
            orderId={order.id}
            orderDate={order.data}
            customerName={order.name}
            customerSurname={order.surname}
            invoice={order.invoice}
            parsedInvoice={parsedInvoice}
            isGeneratingInvoice={isGeneratingInvoice}
            handleGenerateInvoice={handleGenerateInvoice}
            setActiveTab={setActiveTab}
          />

          <OrderStatusCards
            productCount={isEditMode ? editedProducts.length : order.products.length}
            paymentStatus={order.paymentStatus}
            deliveryStatus={order.deliveryStatus}
            getPaymentStatusColor={getPaymentStatusColor}
            getPaymentStatusText={getPaymentStatusText}
            getDeliveryStatusColor={getDeliveryStatusColor}
            getDeliveryStatusText={getDeliveryStatusText}
          />

          <OrderTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            parsedInvoice={parsedInvoice}
            // Props for OrderOverviewTab
            order={order}
            isEditMode={isEditMode}
            editedUserData={editedUserData}
            setEditedUserData={setEditedUserData}
            editedProducts={editedProducts}
            handleEditToggle={handleEditToggle}
            handleSaveChanges={handleSaveChanges}
            isSaving={isSaving}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            hasDiscount={hasDiscount}
            discountPercentage={discountPercentage}
            originalPrice={originalPrice}
            discountAmount={discountAmount}
            handleInvoiceStringSubmit={handleInvoiceStringSubmit}
            invoiceStringInput={invoiceStringInput}
            setInvoiceStringInput={setInvoiceStringInput}
            isSubmittingInvoiceString={isSubmittingInvoiceString}
            // Props for OrderProductsTab
            handleQuantityChange={handleQuantityChange}
            handleDeleteProduct={handleDeleteProduct}
            setIsAddProductsModalOpen={setIsAddProductsModalOpen}
            // Props for OrderInvoiceTab
            isLoadingInvoiceDetails={isLoadingInvoiceDetails}
            invoiceError={invoiceError}
            invoiceDetails={invoiceDetails}
            getStatusColor={getStatusColor}
            formatDateTime={formatDateTime}
          />
        </div>

        {/* Modals outside of the main component structure for better layering */}
        <NovaPoshtaModal
          isOpen={isNovaPoshtaModalOpen}
          onClose={() => setIsNovaPoshtaModalOpen(false)}
          onGenerate={handleGenerateInvoiceWithLocation}
        />

        <AddProductsModal
          isOpen={isAddProductsModalOpen}
          onClose={() => setIsAddProductsModalOpen(false)}
          availableProducts={availableProducts}
          isLoadingProducts={isLoadingProducts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredAvailableProducts={filteredAvailableProducts}
          displayedProductsCount={displayedProductsCount}
          hasMoreProducts={hasMoreProducts}
          productListRef={productListRef}
          handleAddProduct={handleAddProduct}
          editedProducts={editedProducts}
          PRODUCTS_PER_PAGE={PRODUCTS_PER_PAGE}
          setDisplayedProductsCount={setDisplayedProductsCount}
          formatCurrency={formatCurrency}
        />
      </div>
    </TooltipProvider>
  );
}