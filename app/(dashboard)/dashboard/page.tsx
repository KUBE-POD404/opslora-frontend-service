"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CreditCard,
  FileText,
  Package,
  Receipt,
  ShoppingCart,
  Users,
} from "lucide-react"
import {
  CartesianGrid,
  Area,
  AreaChart,
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
          productData.map((product) =>
            apiFetch<StockBalance>(`/inventory/stock/${product.id}`)
          )
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

  return (
    <div className="space-y-5 text-[#e8edf4]">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            <span className="h-2 w-2 rounded-sm bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.55)]" />
            Today&apos;s operating view
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f7f8fb]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#8790a0]">
            Cash, receivables, orders, and stock signals for the current workspace.
          </p>
        </div>
        <Button asChild className="h-9 rounded-md bg-cyan-400 text-[#061014] hover:bg-cyan-300">
          <Link href="/orders">
            <ShoppingCart className="size-4" />
            New order
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg bg-white/10" />
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-white/10 bg-[#141922] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cfd6e1]">Collections</h2>
              <p className="mt-1 text-sm text-[#8790a0]">Successful payment volume by receipt date.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.03] text-[#d9e2ee] hover:bg-white/[0.07]">
              <Link href="/payments">
                Payments
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full rounded-lg bg-white/10" />
            ) : collectionsByDay.length === 0 ? (
              <EmptyState title="No payments yet" body="Payments will appear here once invoices start getting paid." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={collectionsByDay}>
                  <defs>
                    <linearGradient id="collectionsFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.62} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#788191" tickLine={false} axisLine={false} />
                  <YAxis stroke="#788191" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => money(Number(value))}
                    contentStyle={{
                      background: "#10151d",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#e8edf4",
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#22d3ee" strokeWidth={2} fill="url(#collectionsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#141922] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cfd6e1]">Needs attention</h2>
            <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-xs text-amber-200">
              {stats.overdueInvoices.length + stats.ordersToInvoice.length + stats.lowStock.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-md bg-white/10" />
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
        <section className="rounded-lg border border-white/10 bg-[#141922] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cfd6e1]">Recent payments</h2>
              <p className="mt-1 text-sm text-[#8790a0]">Latest receipts across invoices.</p>
            </div>
            <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
              {money(stats.collected)}
            </Badge>
          </div>
          {loading ? (
            <Skeleton className="h-40 rounded-lg bg-white/10" />
          ) : recentPayments.length === 0 ? (
            <EmptyState title="No receipts" body="Add payments from an invoice to start reconciliation." />
          ) : (
            <div className="divide-y divide-white/10">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-[#f7f8fb]">Invoice #{payment.invoice_id}</div>
                    <div className="text-sm text-[#8790a0]">
                      {payment.payment_method.replace("_", " ")} - {shortDate(payment.paid_at)}
                    </div>
                  </div>
                  <div className="font-semibold text-[#e8edf4]">{money(payment.amount, payment.currency)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-[#141922] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cfd6e1]">Workspace snapshot</h2>
              <p className="mt-1 text-sm text-[#8790a0]">Small signals for the current account.</p>
            </div>
            <Users className="size-5 text-cyan-300/80" />
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
        : "text-[#f7f8fb]"

  return (
    <div className="rounded-lg border border-white/10 bg-[#141922] p-4 shadow-[0_14px_48px_rgba(0,0,0,0.20)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8790a0]">{label}</div>
          <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
        </div>
        <Icon className="size-5 text-[#8790a0]" />
      </div>
      <div className="mt-2 text-sm text-[#8790a0]">{helper}</div>
    </div>
  )
}

function ActionRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]"
    >
      <span className="font-medium text-[#e8edf4]">{label}</span>
      <span className={value > 0 ? "font-semibold text-amber-300" : "text-[#8790a0]"}>
        {value}
      </span>
    </Link>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
      <div className="font-medium text-[#f7f8fb]">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-[#8790a0]">{body}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.10em] text-[#8790a0]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[#f7f8fb]">{value}</div>
    </div>
  )
}
