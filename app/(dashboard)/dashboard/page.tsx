"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageSquareText,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  Sparkles,
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
    <div className="-m-4 min-h-[calc(100svh-var(--header-height))] bg-[#f7f7f4] p-4 text-[#18181b] [font-feature-settings:'cv01','ss03'] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_1px_1px_rgba(24,24,27,0.04),0_18px_60px_rgba(24,24,27,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="p-5 md:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f7f4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b6f76]">
                    <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                    Today&apos;s operating view
                  </div>
                  <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.06em] text-balance md:text-5xl">
                    What needs attention before the day moves forward?
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b6f76] md:text-base">
                    Cash, receivables, orders, stock, and Lora AI suggestions in one calm workspace.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Button asChild className="h-10 rounded-[9px] bg-[#18181b] text-white hover:bg-black">
                    <Link href="/orders">
                      <ShoppingCart className="size-4" />
                      New order
                    </Link>
                  </Button>
                  <div className="flex h-9 min-w-56 items-center gap-2 rounded-[9px] border border-black/10 bg-[#fbfbf9] px-3 text-xs text-[#6b6f76]">
                    <Search className="size-3.5" /> Ask Lora or search workspace
                  </div>
                </div>
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl bg-black/5" />
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

            <aside className="border-t border-black/10 bg-[#111113] p-5 text-white lg:border-l lg:border-t-0 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">
                    <Bot className="size-4" /> Lora AI
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">Natural-language operations</h2>
                </div>
                <Sparkles className="size-5 text-indigo-300" />
              </div>
              <div className="mt-5 space-y-3">
                <LoraPrompt text={`Summarize ${stats.collectibleInvoices.length} open invoices and draft follow-ups`} />
                <LoraPrompt text={`Find ${stats.ordersToInvoice.length} orders ready to invoice`} />
                <LoraPrompt text={`Explain ${stats.lowStock.length} low-stock risks before I confirm orders`} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquareText className="size-4 text-indigo-300" /> Suggested next action
                </div>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {attentionCount > 0
                    ? `There are ${attentionCount} operating signals. Ask Lora to prioritize them and create the first draft actions.`
                    : "No urgent signals are visible. Ask Lora for a daily summary or create the next order."}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[18px] border border-black/10 bg-white p-5 shadow-[0_1px_1px_rgba(24,24,27,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#6b6f76]">Collections</h2>
                <p className="mt-1 text-sm text-[#6b6f76]">Successful payment volume by receipt date.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-[9px] border-black/10 bg-white">
                <Link href="/payments">
                  Payments
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="h-[280px]">
              {loading ? (
                <Skeleton className="h-full rounded-2xl bg-black/5" />
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
                    <CartesianGrid stroke="rgba(24,24,27,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke="#8b9098" tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b9098" tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => money(Number(value))}
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid rgba(24,24,27,0.12)",
                        borderRadius: 12,
                        color: "#18181b",
                      }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#3f46d8" strokeWidth={2} fill="url(#collectionsFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-[18px] border border-black/10 bg-white p-5 shadow-[0_1px_1px_rgba(24,24,27,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#6b6f76]">Needs attention</h2>
                <p className="mt-1 text-sm text-[#6b6f76]">Open work Lora can help triage.</p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {attentionCount}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 rounded-xl bg-black/5" />
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
          <section className="rounded-[18px] border border-black/10 bg-white p-5 shadow-[0_1px_1px_rgba(24,24,27,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#6b6f76]">Recent payments</h2>
                <p className="mt-1 text-sm text-[#6b6f76]">Latest receipts across invoices.</p>
              </div>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                {money(stats.collected)}
              </Badge>
            </div>
            {loading ? (
              <Skeleton className="h-40 rounded-2xl bg-black/5" />
            ) : recentPayments.length === 0 ? (
              <EmptyState title="No receipts" body="Add payments from an invoice to start reconciliation." />
            ) : (
              <div className="divide-y divide-black/10">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium text-[#18181b]">Invoice #{payment.invoice_id}</div>
                      <div className="text-sm text-[#6b6f76]">
                        {payment.payment_method.replace("_", " ")} · {shortDate(payment.paid_at)}
                      </div>
                    </div>
                    <div className="font-semibold text-[#18181b]">{money(payment.amount, payment.currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[18px] border border-black/10 bg-white p-5 shadow-[0_1px_1px_rgba(24,24,27,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#6b6f76]">Workspace snapshot</h2>
                <p className="mt-1 text-sm text-[#6b6f76]">Small signals for the current account.</p>
              </div>
              <Users className="size-5 text-[#6b6f76]" />
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
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-[#18181b]"

  return (
    <div className="rounded-2xl border border-black/10 bg-[#fbfbf9] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b6f76]">{label}</div>
          <div className={`mt-2 text-2xl font-semibold tracking-[-0.05em] ${toneClass}`}>{value}</div>
        </div>
        <Icon className="size-5 text-[#8b9098]" />
      </div>
      <div className="mt-2 text-sm text-[#6b6f76]">{helper}</div>
    </div>
  )
}

function LoraPrompt({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/72">
      <span className="mr-2 text-white/35">Ask</span>{text}
    </div>
  )
}

function ActionRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-black/10 bg-[#fbfbf9] px-3 py-3 transition hover:border-[#3f46d8]/25 hover:bg-[#f4f4ff]"
    >
      <span className="font-medium text-[#18181b]">{label}</span>
      <span className={value > 0 ? "font-semibold text-amber-700" : "text-[#6b6f76]"}>{value}</span>
    </Link>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-[#fbfbf9] p-6 text-center">
      <CheckCircle2 className="mb-3 size-5 text-[#8b9098]" />
      <div className="font-medium text-[#18181b]">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-[#6b6f76]">{body}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/10 bg-[#fbfbf9] p-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b6f76]">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#18181b]">{value}</div>
    </div>
  )
}
