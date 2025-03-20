"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDown, ArrowUp, ArrowUpRight, Calendar, Package, ShoppingCart, TrendingUp } from "lucide-react"
import { Store } from "@/constants/store"
import Link from "next/link"

// Define chart configuration
const chartConfig = {
  totalOrders: {
    label: "Замовлення",
    color: "#2563eb",
  },
} satisfies ChartConfig

// TypeScript interfaces
interface Order {
  products: {
    product: string
    amount: number
  }[]
  userId: string
  value: number
  name: string
  surname: string
  phoneNumber: string
  email: string
  paymentType: string
  deliveryMethod: string
  city: string
  adress: string
  postalCode: string
  comment: string | undefined
  paymentStatus: string
  deliveryStatus: string
  data: Date
}

interface TimePeriod {
  dateName: string
  orders: Order[]
  totalValue: number
  totalOrders: number
}

interface Stats {
  data: TimePeriod[]
  totalValue: number
  totalOrders: number
  totalProductsSold: number
  averageOrderValue: number
  mostPopularProduct: {
    name: string
    id: string
    searchParam: string
    quantity: number
  }
  percentageStats: {
    totalValue: number
    totalOrders: number
    totalProductsSold: number
    averageOrderValue: number
  }
  numericStats: {
    totalValue: number
    totalOrders: number
    totalProductsSold: number
    averageOrderValue: number
  }
}

interface Data {
  dayStats: Stats
  weekStats: Stats
  monthStats: Stats
  threeMonthsStats: Stats
  sixMonthsStats: Stats
  yearStats: Stats
}

// Time period options
const timePeriodOptions = [
  { value: "day", label: "За сьогодні" },
  { value: "week", label: "Останній тиждень" },
  { value: "month", label: "Місяць" },
  { value: "threeMonths", label: "Три місяці" },
  { value: "sixMonths", label: "Шість місяців" },
  { value: "year", label: "Цього року" },
]

const Dashboard = ({ stringifiedData }: { stringifiedData: string }) => {
  const data: Data = JSON.parse(stringifiedData)
  const [timePeriod, setTimePeriod] = useState<Stats>(data.dayStats)
  const [viewMode, setViewMode] = useState<"percentage" | "numeric">("percentage")
  const [isMobile, setIsMobile] = useState(false)
  const [chartHeight, setChartHeight] = useState(300)

  // Check if mobile on mount and on resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)

      // Adjust chart height based on screen width
      if (window.innerWidth < 480) {
        setChartHeight(220)
      } else if (window.innerWidth < 768) {
        setChartHeight(260)
      } else {
        setChartHeight(300)
      }
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  // Function to select time period
  const selectTimePeriod = (value: string) => {
    switch (value) {
      case "day":
        setTimePeriod(data.dayStats)
        break
      case "week":
        setTimePeriod(data.weekStats)
        break
      case "month":
        setTimePeriod(data.monthStats)
        break
      case "threeMonths":
        setTimePeriod(data.threeMonthsStats)
        break
      case "sixMonths":
        setTimePeriod(data.sixMonthsStats)
        break
      case "year":
        setTimePeriod(data.yearStats)
        break
    }
  }

  // Helper function to format numbers
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  // Helper function to get trend indicator
  const getTrendIndicator = (value: number, mode: "percentage" | "numeric") => {
    const isPositive = value >= 0
    const formattedValue = mode === "percentage" ? `${Math.abs(value).toFixed(0)}%` : formatNumber(Math.abs(value))

    return {
      icon: isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />,
      value: mode === "percentage" ? formattedValue : isPositive ? `+${formattedValue}` : `-${formattedValue}`,
      color: isPositive ? "text-emerald-500" : "text-rose-500",
      bgColor: isPositive ? "bg-emerald-50" : "bg-rose-50",
    }
  }

  // Prepare chart data - limit data points for mobile
  const prepareChartData = () => {
    if (isMobile && timePeriod.data.length > 5) {
      // For mobile, if we have more than 5 data points, show only every nth item
      const step = Math.ceil(timePeriod.data.length / 5)
      return timePeriod.data.filter((_, index) => index % step === 0)
    }
    return timePeriod.data
  }

  // Format X-axis tick for mobile
  const formatXAxisTick = (value: string) => {
    if (isMobile) {
      // Shorten labels on mobile
      if (value.length > 6) {
        return value.substring(0, 6) + "..."
      }
    }
    return value
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-3 sm:p-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-heading3-bold md:text-heading2-bold">Дашбоард</h1>
          <p className="text-small-medium md:text-base-medium text-muted-foreground">
            Коротка аналітика продажів та замовлень
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select onValueChange={selectTimePeriod} defaultValue="day">
            <SelectTrigger className="w-full sm:w-[180px] text-small-medium">
              <SelectValue placeholder="Період часу" />
            </SelectTrigger>
            <SelectContent>
              {timePeriodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-small-medium">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs
            defaultValue="percentage"
            className="w-full sm:w-[180px]"
            onValueChange={(v) => setViewMode(v as "percentage" | "numeric")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="percentage" className="text-small-medium">
                Відсотки
              </TabsTrigger>
              <TabsTrigger value="numeric" className="text-small-medium">
                Числа
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Stats Card */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base-semibold">Загальний дохід</CardTitle>
          </div>
          <div className="hidden sm:flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-subtle-medium text-muted-foreground">Порівняння з минулим періодом</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline space-x-2">
            <h2 className="text-heading2-bold md:text-heading1-bold">
              {Store.currency_sign}
              {formatNumber(timePeriod.totalValue)}
            </h2>

            {/* Trend indicator */}
            <div
              className={`flex items-center rounded-md px-2 py-1 text-small-semibold ${
                getTrendIndicator(
                  viewMode === "percentage"
                    ? timePeriod.percentageStats.totalValue
                    : timePeriod.numericStats.totalValue,
                  viewMode,
                ).bgColor
              } ${
                getTrendIndicator(
                  viewMode === "percentage"
                    ? timePeriod.percentageStats.totalValue
                    : timePeriod.numericStats.totalValue,
                  viewMode,
                ).color
              }`}
            >
              {
                getTrendIndicator(
                  viewMode === "percentage"
                    ? timePeriod.percentageStats.totalValue
                    : timePeriod.numericStats.totalValue,
                  viewMode,
                ).icon
              }
              <span className="ml-1">
                {
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalValue
                      : timePeriod.numericStats.totalValue,
                    viewMode,
                  ).value
                }
              </span>
            </div>
          </div>
        </CardContent>

        {/* Chart */}
        <div className={`h-[${chartHeight}px] w-full px-1 sm:px-4 overflow-x-auto`}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ChartContainer config={chartConfig}>
              <BarChart
                data={prepareChartData()}
                margin={
                  isMobile ? { top: 20, right: 10, left: 0, bottom: 20 } : { top: 20, right: 20, left: 20, bottom: 20 }
                }
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="dateName"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  className="text-tiny-medium sm:text-small-medium"
                  tickFormatter={formatXAxisTick}
                  interval={isMobile ? 0 : "preserveStartEnd"}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 50 : 30}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={5}
                  tickFormatter={(value) => (isMobile && value > 999 ? `${Math.floor(value / 1000)}k` : `${value}`)}
                  className="text-tiny-medium sm:text-small-medium"
                  width={isMobile ? 25 : 40}
                />
                <Tooltip content={<CustomTooltip isMobile={isMobile} />} />
                <Bar
                  dataKey="totalOrders"
                  fill="var(--color-totalOrders)"
                  radius={[4, 4, 0, 0]}
                  barSize={isMobile ? 20 : 30}
                />
              </BarChart>
            </ChartContainer>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-small-semibold sm:text-base-semibold">Всього замовлень</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-heading4-medium sm:text-heading3-bold">{timePeriod.totalOrders}</div>
            <div className="flex items-center pt-1">
              <div
                className={`mr-2 rounded-sm p-1 ${
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalOrders
                      : timePeriod.numericStats.totalOrders,
                    viewMode,
                  ).bgColor
                }`}
              >
                {
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalOrders
                      : timePeriod.numericStats.totalOrders,
                    viewMode,
                  ).icon
                }
              </div>
              <div
                className={`text-subtle-medium sm:text-small-semibold ${
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalOrders
                      : timePeriod.numericStats.totalOrders,
                    viewMode,
                  ).color
                }`}
              >
                {
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalOrders
                      : timePeriod.numericStats.totalOrders,
                    viewMode,
                  ).value
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Products Sold */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-small-semibold sm:text-base-semibold">Продано товарів</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-heading4-medium sm:text-heading3-bold">{timePeriod.totalProductsSold}</div>
            <div className="flex items-center pt-1">
              <div
                className={`mr-2 rounded-sm p-1 ${
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalProductsSold
                      : timePeriod.numericStats.totalProductsSold,
                    viewMode,
                  ).bgColor
                }`}
              >
                {
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalProductsSold
                      : timePeriod.numericStats.totalProductsSold,
                    viewMode,
                  ).icon
                }
              </div>
              <div
                className={`text-subtle-medium sm:text-small-semibold ${
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalProductsSold
                      : timePeriod.numericStats.totalProductsSold,
                    viewMode,
                  ).color
                }`}
              >
                {
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.totalProductsSold
                      : timePeriod.numericStats.totalProductsSold,
                    viewMode,
                  ).value
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-small-semibold sm:text-base-semibold">Середня ціна</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-heading4-medium sm:text-heading3-bold">
              {Store.currency_sign}
              {formatNumber(timePeriod.averageOrderValue)}
            </div>
            <div className="flex items-center pt-1">
              <div
                className={`mr-2 rounded-sm p-1 ${
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.averageOrderValue
                      : timePeriod.numericStats.averageOrderValue,
                    viewMode,
                  ).bgColor
                }`}
              >
                {
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.averageOrderValue
                      : timePeriod.numericStats.averageOrderValue,
                    viewMode,
                  ).icon
                }
              </div>
              <div
                className={`text-subtle-medium sm:text-small-semibold ${
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.averageOrderValue
                      : timePeriod.numericStats.averageOrderValue,
                    viewMode,
                  ).color
                }`}
              >
                {
                  getTrendIndicator(
                    viewMode === "percentage"
                      ? timePeriod.percentageStats.averageOrderValue
                      : timePeriod.numericStats.averageOrderValue,
                    viewMode,
                  ).value
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Most Popular Product */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-small-semibold sm:text-base-semibold">Популярний товар</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link
              href={`/catalog/${timePeriod.mostPopularProduct.id}`}
              className="text-heading4-medium sm:text-heading3-bold hover:underline truncate block"
              target="_blank"
            >
              {timePeriod.mostPopularProduct.name}
            </Link>
            <div className="flex items-center justify-between pt-1">
              <div className="text-subtle-medium sm:text-small-medium text-muted-foreground">Продано</div>
              <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-subtle-medium sm:text-small-semibold text-emerald-700">
                {timePeriod.mostPopularProduct.quantity}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer note */}
      <div className="text-x-small-semibold sm:text-subtle-medium text-muted-foreground text-center md:text-right mt-2 sm:mt-4">
        <p>
          <span className="text-emerald-500 text-small-semibold">{viewMode === "percentage" ? "% " : "+ "}</span>
          Порівняння з минулим періодом | Тільки оплачені і доставлені замовлення
        </p>
      </div>
    </div>
  )
}

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label, isMobile }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload

    let totalProductsSold = 0
    data.orders.forEach((order: Order) => {
      order.products.forEach((product) => {
        totalProductsSold += product.amount
      })
    })

    const averageOrderValue = data.totalValue > 0 ? data.totalValue / data.totalOrders : 0

    return (
      <div className={`rounded-lg border bg-background p-2 sm:p-3 shadow-md max-w-[${isMobile ? "200px" : "300px"}]`}>
        <div className="text-small-semibold sm:text-base-semibold">{label}</div>
        <div className="grid grid-cols-2 gap-1 sm:gap-2 mt-1 sm:mt-2">
          <div className="text-tiny-medium sm:text-small-medium text-muted-foreground">Замовлень:</div>
          <div className="text-tiny-medium sm:text-small-semibold text-right">{data.totalOrders}</div>

          <div className="text-tiny-medium sm:text-small-medium text-muted-foreground">Загальна ціна:</div>
          <div className="text-tiny-medium sm:text-small-semibold text-emerald-600 text-right">
            {new Intl.NumberFormat("uk-UA", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(data.totalValue)}
          </div>

          <div className="text-tiny-medium sm:text-small-medium text-muted-foreground">Продано товару:</div>
          <div className="text-tiny-medium sm:text-small-semibold text-right">{totalProductsSold}</div>

          <div className="text-tiny-medium sm:text-small-medium text-muted-foreground">Середня вартість:</div>
          <div className="text-tiny-medium sm:text-small-semibold text-emerald-600 text-right">
            {new Intl.NumberFormat("uk-UA", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(averageOrderValue)}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default Dashboard

