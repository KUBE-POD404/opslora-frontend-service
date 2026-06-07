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
  Bar,
  BarChart,
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#12141a]">Dashboard</h1>
          <p className="text-sm text-[#6b707d]">
            A quick view of cash, invoices, orders, and inventory attention.
          </p>
        </div>
        <Button asChild className="h-9 rounded-md">
          <Link href="/orders">
            <ShoppingCart className="size-4" />
            New order
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg" />
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

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-[#e0e4eb] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#12141a]">Collections</h2>
              <p className="text-sm text-[#6b707d]">Recent successful payment volume.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/payments">
                Payments
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full rounded-lg" />
            ) : collectionsByDay.length === 0 ? (
              <EmptyState title="No payments yet" body="Payments will appear here once invoices start getting paid." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectionsByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e4eb] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#12141a]">Needs attention</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-md" />
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

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-[#e0e4eb] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#12141a]">Recent payments</h2>
              <p className="text-sm text-[#6b707d]">Latest receipts across invoices.</p>
            </div>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
              {money(stats.collected)}
            </Badge>
          </div>
          {loading ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : recentPayments.length === 0 ? (
            <EmptyState title="No receipts" body="Add payments from an invoice to start reconciliation." />
          ) : (
            <div className="divide-y">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-[#12141a]">Invoice #{payment.invoice_id}</div>
                    <div className="text-sm text-[#6b707d]">
                      {payment.payment_method.replace("_", " ")} - {shortDate(payment.paid_at)}
                    </div>
                  </div>
                  <div className="font-semibold">{money(payment.amount, payment.currency)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[#e0e4eb] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#12141a]">Workspace snapshot</h2>
              <p className="text-sm text-[#6b707d]">Small signals for the current account.</p>
            </div>
            <Users className="size-5 text-[#6b707d]" />
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
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-[#12141a]"

  return (
    <div className="rounded-lg border border-[#e0e4eb] bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[#6b707d]">{label}</div>
          <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
        </div>
        <Icon className="size-5 text-[#6b707d]" />
      </div>
      <div className="mt-2 text-sm text-[#6b707d]">{helper}</div>
    </div>
  )
}

function ActionRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-[#e0e4eb] px-3 py-3 hover:bg-[#f8f9fa]"
    >
      <span className="font-medium text-[#12141a]">{label}</span>
      <span className={value > 0 ? "font-semibold text-amber-700" : "text-[#6b707d]"}>
        {value}
      </span>
    </Link>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-[#d7dbe2] p-6 text-center">
      <div className="font-medium text-[#12141a]">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-[#6b707d]">{body}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#e0e4eb] p-3">
      <div className="text-sm text-[#6b707d]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[#12141a]">{value}</div>
    </div>
  )
}
