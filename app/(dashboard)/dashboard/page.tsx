"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type Invoice = {
  id: number
  invoice_number?: string | null
  order_id: number
  customer_name?: string | null
  total: number
  status: "PAID" | "UNPAID" | "PARTIALLY_PAID" | "CANCELLED" | "REFUNDED"
  due_date?: string
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

type Customer = {
  id: number
  status?: string
}

type Payment = {
  id: number
  invoice_id: number
  amount: number
  currency: string
  payment_method: string
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

function money(value: number, currency = "INR") {
  const prefix = currency === "INR" ? "Rs" : currency
  return `${prefix} ${Number(value || 0).toFixed(2)}`
}

function shortDate(value?: string) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stockByProduct, setStockByProduct] = useState<Record<number, StockBalance>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)

        const [invoiceData, orderData, customerData, paymentData, productData] =
          await Promise.all([
            apiFetch<Invoice[]>("/invoices/?limit=100"),
            apiFetch<Order[]>("/orders/?limit=100"),
            apiFetch<Customer[]>("/customers/?limit=100"),
            apiFetch<Payment[]>("/payments/"),
            apiFetch<Product[]>("/inventory/products?limit=100"),
          ])

        setInvoices(invoiceData)
        setOrders(orderData)
        setCustomers(customerData)
        setPayments(paymentData)
        setProducts(productData)

        const stockResults = await Promise.allSettled(
          productData.map((product) => apiFetch<StockBalance>(`/inventory/stock/${product.id}`))
        )
        const nextStock: Record<number, StockBalance> = {}

        stockResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            nextStock[productData[index].id] = result.value
          }
        })

        setStockByProduct(nextStock)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const stats = useMemo(() => {
    const collectibleInvoices = invoices.filter((invoice) =>
      ["UNPAID", "PARTIALLY_PAID"].includes(invoice.status)
    )
    const overdueInvoices = collectibleInvoices.filter((invoice) => {
      if (!invoice.due_date) return false
      return new Date(invoice.due_date).getTime() < Date.now()
    })
    const paidInvoices = invoices.filter((invoice) => invoice.status === "PAID")
    const successfulPayments = payments.filter((payment) =>
      ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status)
    )
    const lowStock = products.filter((product) => {
      const stock = stockByProduct[product.id]
      if (!stock) return false

      return Number(stock.quantity_on_hand) <= Number(stock.low_stock_threshold)
    })
    const confirmedOrders = orders.filter((order) => order.status === "CONFIRMED")
    const orderIdsWithInvoices = new Set(invoices.map((invoice) => invoice.order_id))
    const ordersToInvoice = confirmedOrders.filter((order) => !orderIdsWithInvoices.has(order.id))
    const draftOrders = orders.filter((order) => order.status === "CREATED")

    return {
      activeCustomers: customers.filter((customer) => customer.status !== "INACTIVE").length,
      collected: successfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      paidRevenue: paidInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      dueAmount: collectibleInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      overdueInvoices,
      lowStock,
      ordersToInvoice,
      draftOrders,
      collectibleInvoices,
    }
  }, [customers, invoices, orders, payments, products, stockByProduct])

  const collectionsByDay = useMemo(() => {
    const map: Record<string, number> = {}

    payments
      .filter((payment) => ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status))
      .slice(0, 30)
      .forEach((payment) => {
        const label = shortDate(payment.paid_at)
        map[label] = (map[label] || 0) + Number(payment.amount || 0)
      })

    return Object.entries(map).map(([date, amount]) => ({ date, amount }))
  }, [payments])

  const recentPayments = payments.slice(0, 5)
  const attentionCount = stats.overdueInvoices.length + stats.ordersToInvoice.length + stats.lowStock.length

  return (
    <div className="-m-4 min-h-[calc(100svh-var(--header-height))] bg-background p-4 text-foreground [font-feature-settings:'cv01','ss03'] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_1px_1px_rgba(24,24,27,0.04),0_18px_60px_rgba(24,24,27,0.08)]">
          <div className="grid gap-0">
            <div className="p-5 md:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    <span className="size-2 rounded-full bg-emerald-400/100 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                    Today&apos;s operating view
                  </div>
                  <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.06em] text-balance md:text-5xl">
                    What needs attention before the day moves forward?
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    Cash, receivables, orders, stock, and operating signals in one dark workspace.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Button asChild className="h-10 rounded-[9px]">
                    <Link href="/orders">
                      <ShoppingCart className="size-4" />
                      New order
                    </Link>
                  </Button>
                  <div className="flex h-9 min-w-56 items-center gap-2 rounded-[9px] border border-border bg-muted/35 px-3 text-xs text-muted-foreground">
                    <Search className="size-3.5" /> Search workspace
                  </div>
                </div>
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl bg-muted/50" />
                  ))
                ) : (
                  <>
                    <Metric icon={CreditCard} label="Collected" value={money(stats.collected)} helper="Successful payments" tone="ok" />
                    <Metric icon={Receipt} label="Amount due" value={money(stats.dueAmount)} helper={`${stats.collectibleInvoices.length} invoices open`} tone={stats.dueAmount > 0 ? "warn" : "neutral"} />
                    <Metric icon={FileText} label="To invoice" value={stats.ordersToInvoice.length} helper="Confirmed orders" tone={stats.ordersToInvoice.length > 0 ? "warn" : "neutral"} />
                    <Metric icon={Package} label="Low stock" value={stats.lowStock.length} helper="Products at threshold" tone={stats.lowStock.length > 0 ? "warn" : "neutral"} />
                  </>
                )}
              </div>
            </div>

          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[18px] border border-border bg-card p-5 shadow-[0_1px_1px_rgba(24,24,27,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Collections</h2>
                <p className="mt-1 text-sm text-muted-foreground">Successful payment volume by receipt date.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-[9px] border-border bg-card">
                <Link href="/payments">
                  Payments
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="h-[280px]">
              {loading ? (
                <Skeleton className="h-full rounded-2xl bg-muted/50" />
              ) : collectionsByDay.length === 0 ? (
                <EmptyState title="No payments yet" body="Payments will appear here once invoices start getting paid." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={collectionsByDay}>
                    <defs>
                      <linearGradient id="collectionsFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3f46d8" stopOpacity={0.34} />
                        <stop offset="100%" stopColor="#3f46d8" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke="#8b9098" tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b9098" tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => money(Number(value))}
                      contentStyle={{
                        background: "#0d1220",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#f7f8fb",
                      }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#3f46d8" strokeWidth={2} fill="url(#collectionsFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-[18px] border border-border bg-card p-5 shadow-[0_1px_1px_rgba(24,24,27,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Needs attention</h2>
                <p className="mt-1 text-sm text-muted-foreground">Open work that needs a decision.</p>
              </div>
              <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                {attentionCount}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 rounded-xl bg-muted/50" />
                ))
              ) : (
                <>
                  <ActionRow label="Overdue invoices" value={stats.overdueInvoices.length} href="/invoices" />
                  <ActionRow label="Orders awaiting invoice" value={stats.ordersToInvoice.length} href="/orders" />
                  <ActionRow label="Draft orders" value={stats.draftOrders.length} href="/orders" />
                  <ActionRow label="Low-stock products" value={stats.lowStock.length} href="/inventory" />
                </>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[18px] border border-border bg-card p-5 shadow-[0_1px_1px_rgba(24,24,27,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Recent payments</h2>
                <p className="mt-1 text-sm text-muted-foreground">Latest receipts across invoices.</p>
              </div>
              <Badge className="border-emerald-300/25 bg-emerald-400/10 text-emerald-300">
                {money(stats.collected)}
              </Badge>
            </div>
            {loading ? (
              <Skeleton className="h-40 rounded-2xl bg-muted/50" />
            ) : recentPayments.length === 0 ? (
              <EmptyState title="No receipts" body="Add payments from an invoice to start reconciliation." />
            ) : (
              <div className="divide-y divide-black/10">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium text-foreground">Invoice #{payment.invoice_id}</div>
                      <div className="text-sm text-muted-foreground">
                        {payment.payment_method.replace("_", " ")} · {shortDate(payment.paid_at)}
                      </div>
                    </div>
                    <div className="font-semibold text-foreground">{money(payment.amount, payment.currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[18px] border border-border bg-card p-5 shadow-[0_1px_1px_rgba(24,24,27,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Workspace snapshot</h2>
                <p className="mt-1 text-sm text-muted-foreground">Small signals for the current account.</p>
              </div>
              <Users className="size-5 text-muted-foreground" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat label="Customers" value={stats.activeCustomers} />
              <MiniStat label="Products" value={products.length} />
              <MiniStat label="Orders" value={orders.length} />
              <MiniStat label="Invoices" value={invoices.length} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  helper,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  helper: string
  tone?: "neutral" | "ok" | "warn"
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-foreground"

  return (
    <div className="rounded-2xl border border-border bg-muted/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
          <div className={`mt-2 text-2xl font-semibold tracking-[-0.05em] ${toneClass}`}>{value}</div>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{helper}</div>
    </div>
  )
}

function ActionRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-border bg-muted/35 px-3 py-3 transition hover:border-[#3f46d8]/25 hover:bg-muted/60"
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className={value > 0 ? "font-semibold text-amber-300" : "text-muted-foreground"}>{value}</span>
    </Link>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-muted/35 p-6 text-center">
      <CheckCircle2 className="mb-3 size-5 text-muted-foreground" />
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/35 p-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">{value}</div>
    </div>
  )
}
