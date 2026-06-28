"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, BarChart3, CreditCard, FileText, Package, TrendingUp } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type Invoice = {
  id: number
  invoice_number?: string | null
  order_id: number
  customer_name?: string | null
  total: number
  status: string
  due_date?: string | null
  created_at: string
}

type Order = {
  id: number
  customer_id: number
  customer_name?: string | null
  total: number
  status: string
  created_at: string
}

type Payment = {
  id: number
  invoice_id: number
  amount: number
  currency?: string | null
  payment_method?: string | null
  status: string
  paid_at: string
}

type Product = {
  id: number
  name: string
  sku: string
  is_active: boolean
}

type StockBalance = {
  product_id: number
  quantity_on_hand: number | string
  low_stock_threshold: number | string
}

const STATUS_COLORS = ["#38bdf8", "#818cf8", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa"]

function money(value: number, currency = "INR") {
  const prefix = currency === "INR" ? "Rs" : currency
  return `${prefix} ${Number(value || 0).toFixed(2)}`
}

function monthLabel(value?: string | null) {
  if (!value) return "Unknown"
  return new Date(value).toLocaleDateString("en-IN", { month: "short" })
}

function dayLabel(value?: string | null) {
  if (!value) return "Unknown"
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

function groupSum<T>(items: T[], getKey: (item: T) => string, getValue: (item: T) => number) {
  const grouped = new Map<string, number>()
  items.forEach((item) => {
    const key = getKey(item)
    grouped.set(key, (grouped.get(key) ?? 0) + getValue(item))
  })
  return Array.from(grouped, ([name, value]) => ({ name, value }))
}

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stockByProduct, setStockByProduct] = useState<Record<number, StockBalance>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      try {
        setLoading(true)
        const [invoiceData, orderData, paymentData, productData] = await Promise.all([
          apiFetch<Invoice[]>("/invoices/?limit=100"),
          apiFetch<Order[]>("/orders/?limit=100"),
          apiFetch<Payment[]>("/payments/"),
          apiFetch<Product[]>("/inventory/products?limit=100"),
        ])

        if (cancelled) return
        setInvoices(invoiceData)
        setOrders(orderData)
        setPayments(paymentData)
        setProducts(productData)

        const stockResults = await Promise.allSettled(
          productData.map((product) => apiFetch<StockBalance>(`/inventory/stock/${product.id}`))
        )
        const stockMap: Record<number, StockBalance> = {}
        stockResults.forEach((result, index) => {
          if (result.status === "fulfilled") stockMap[productData[index].id] = result.value
        })
        if (!cancelled) setStockByProduct(stockMap)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReports()
    return () => {
      cancelled = true
    }
  }, [])

  const report = useMemo(() => {
    const successfulPayments = payments.filter((payment) => ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status))
    const openInvoices = invoices.filter((invoice) => ["UNPAID", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status))
    const lowStockProducts = products.filter((product) => {
      const stock = stockByProduct[product.id]
      return stock ? Number(stock.quantity_on_hand) <= Number(stock.low_stock_threshold) : false
    })
    const monthlyCollections = groupSum(successfulPayments, (payment) => monthLabel(payment.paid_at), (payment) => Number(payment.amount || 0))
    const invoiceStatus = groupSum(invoices, (invoice) => invoice.status || "UNKNOWN", () => 1)
    const orderVolume = groupSum(orders, (order) => dayLabel(order.created_at), () => 1).slice(-10)
    const revenueByCustomer = groupSum(invoices, (invoice) => invoice.customer_name || "Unknown customer", (invoice) => Number(invoice.total || 0))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    return {
      collected: successfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      invoiceTotal: invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      receivables: openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      lowStockProducts,
      monthlyCollections,
      invoiceStatus,
      orderVolume,
      revenueByCustomer,
    }
  }, [invoices, orders, payments, products, stockByProduct])

  return (
    <div className="-m-4 min-h-[calc(100svh-var(--header-height))] bg-background p-4 text-foreground md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[28px] border border-border bg-card p-6 shadow-[0_24px_90px_rgba(0,0,0,.28)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="border-sky-300/20 bg-sky-300/10 text-sky-200" variant="outline">
                <BarChart3 className="size-3" /> Reports
              </Badge>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.06em] md:text-6xl">
                Calm operating intelligence, separate from the dashboard.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                Trends, risk, collections, and customer concentration in a minimal reporting workspace.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[620px]">
              <ReportStat icon={CreditCard} label="Collected" value={money(report.collected)} loading={loading} />
              <ReportStat icon={FileText} label="Invoiced" value={money(report.invoiceTotal)} loading={loading} />
              <ReportStat icon={TrendingUp} label="Receivable" value={money(report.receivables)} loading={loading} />
              <ReportStat icon={Package} label="Stock risk" value={report.lowStockProducts.length} loading={loading} />
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
          <ChartCard title="Collections trend" description="Successful payment volume grouped by month.">
            <ChartFrame loading={loading} empty={report.monthlyCollections.length === 0} emptyText="No successful payments yet.">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.monthlyCollections}>
                  <defs>
                    <linearGradient id="reportCollections" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#8b9098" tickLine={false} axisLine={false} />
                  <YAxis stroke="#8b9098" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} />
                  <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2.5} fill="url(#reportCollections)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </ChartCard>

          <ChartCard title="Invoice mix" description="Invoice status distribution across the current tenant.">
            <ChartFrame loading={loading} empty={report.invoiceStatus.length === 0} emptyText="No invoices yet.">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={report.invoiceStatus} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={4}>
                    {report.invoiceStatus.map((entry, index) => <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
            <div className="grid gap-2 px-6 pb-6 text-xs text-muted-foreground sm:grid-cols-2">
              {report.invoiceStatus.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg border border-border bg-muted/35 px-3 py-2">
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }} />{item.name}</span>
                  <strong className="text-foreground">{item.value}</strong>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard title="Order activity" description="Recent order count by creation day.">
            <ChartFrame loading={loading} empty={report.orderVolume.length === 0} emptyText="No orders yet.">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.orderVolume}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#8b9098" tickLine={false} axisLine={false} />
                  <YAxis stroke="#8b9098" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#818cf8" />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </ChartCard>

          <ChartCard title="Top customers by invoice value" description="Customer concentration based on invoice totals.">
            <ChartFrame loading={loading} empty={report.revenueByCustomer.length === 0} emptyText="No customer invoice value yet.">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.revenueByCustomer} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis type="number" stroke="#8b9098" tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="#8b9098" width={110} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </ChartCard>
        </div>

        <Card className="border-border bg-card text-foreground shadow-[0_24px_80px_rgba(0,0,0,.18)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-300" /> Report notes</CardTitle>
            <CardDescription>Minimal decision signals pulled from live tenant APIs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <Insight label="Receivable pressure" value={report.receivables > 0 ? `${money(report.receivables)} still open` : "No open receivables"} />
            <Insight label="Inventory risk" value={report.lowStockProducts.length > 0 ? `${report.lowStockProducts.length} product(s) at threshold` : "No low-stock products loaded"} />
            <Insight label="Reporting window" value="Latest 100 invoices, orders, and products" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const tooltipStyle = {
  background: "#0d1220",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "#f7f8fb",
}

function ReportStat({ icon: Icon, label, value, loading }: Readonly<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; loading: boolean }>) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Icon className="size-3.5" /> {label}</div>
      {loading ? <Skeleton className="mt-3 h-7 bg-muted/60" /> : <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">{value}</div>}
    </div>
  )
}

function ChartCard({ title, description, children }: Readonly<{ title: string; description: string; children: React.ReactNode }>) {
  return (
    <Card className="overflow-hidden border-border bg-card text-foreground shadow-[0_24px_80px_rgba(0,0,0,.18)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children}
    </Card>
  )
}

function ChartFrame({ loading, empty, emptyText, children }: Readonly<{ loading: boolean; empty: boolean; emptyText: string; children: React.ReactNode }>) {
  return (
    <CardContent>
      <div className="h-[310px] rounded-2xl border border-border bg-muted/30 p-3">
        {loading ? <Skeleton className="h-full rounded-xl bg-muted/60" /> : empty ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{emptyText}</div> : children}
      </div>
    </CardContent>
  )
}

function Insight({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7dd3fc]">{label}</div>
      <div className="mt-2 text-foreground">{value}</div>
    </div>
  )
}
