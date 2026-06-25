"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Loader2, Plus, Printer } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiFetch } from "@/lib/api"

type InvoiceLine = {
  id: number
  sku?: string | null
  product_name: string
  hsn_sac_code?: string | null
  unit_of_measure?: string | null
  quantity: number
  unit_price: number
  tax_rate: number
  taxable_value: number
  tax_amount: number
  line_total: number
}

type InvoiceTaxSummary = {
  tax_component: string
  tax_rate: number
  taxable_value: number
  tax_amount: number
}

type Invoice = {
  id: number
  invoice_number?: string | null
  invoice_template_key?: string | null
  order_id: number
  customer_id?: number | null
  customer_name?: string | null
  customer_email?: string | null
  customer_gstin?: string | null
  customer_place_of_supply?: string | null
  seller_legal_name?: string | null
  seller_display_name?: string | null
  seller_email?: string | null
  seller_phone?: string | null
  seller_tax_id?: string | null
  seller_address?: string | null
  seller_country?: string | null
  seller_state?: string | null
  invoice_terms?: string | null
  invoice_footer?: string | null
  round_off_enabled: boolean
  subtotal: number
  tax: number
  total: number
  due_date: string
  status: string
  discount_type?: string | null
  discount_value: number
  created_at: string
  lines: InvoiceLine[]
  tax_summary: InvoiceTaxSummary[]
}

type Payment = {
  id: number
  invoice_id: number
  amount: number
  currency: string
  payment_method: string
  payment_type: string
  status: string
  reference_number?: string | null
  gateway_provider?: string | null
  paid_at: string
  note?: string | null
}

function money(value: number, currency = "INR") {
  const prefix = currency === "INR" ? "Rs" : currency
  return `${prefix} ${Number(value || 0).toFixed(2)}`
}

function date(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusClass(status: string) {
  if (status === "PAID" || status === "SUCCEEDED") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "PARTIALLY_PAID" || status === "PARTIALLY_REFUNDED") return "border-blue-200 bg-blue-50 text-blue-700"
  if (["CANCELLED", "REFUNDED"].includes(status)) return "border-red-200 bg-red-50 text-red-700"
  return "border-amber-200 bg-amber-50 text-amber-700"
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-normal text-[#6b707d]">{label}</p>
      <p className="mt-1 font-medium text-[#12141a]">{value || "-"}</p>
    </div>
  )
}

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPayments, setLoadingPayments] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const inv = await apiFetch<Invoice>(`/invoices/${id}`)
        if (!active) return
        setInvoice(inv)
        setLoading(false)

        try {
          const pay = await apiFetch<Payment[]>(`/payments/invoice/${inv.id}`)
          if (active) setPayments(pay)
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not load payments"
          toast.error(message)
        } finally {
          if (active) setLoadingPayments(false)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load invoice"
        toast.error(message)
        if (active) {
          setLoading(false)
          setLoadingPayments(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  const paidAmount = useMemo(
    () =>
      payments
        .filter((payment) => payment.status !== "REFUNDED")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  )
  const balanceDue = Math.max(Number(invoice?.total || 0) - paidAmount, 0)

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!invoice) return null

  const sellerName = invoice.seller_display_name || invoice.seller_legal_name || "Seller"
  const invoiceLabel = invoice.invoice_number || `INV-${invoice.id}`
  const taxMode = invoice.tax_summary.some((item) => item.tax_component === "IGST")
    ? "IGST"
    : "CGST + SGST"

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" className="-ml-3 h-8" onClick={() => router.push("/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to invoices
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[#12141a]">Invoice {invoiceLabel}</h1>
            <p className="text-sm text-[#6b707d]">
              Order #{invoice.order_id} - {invoice.customer_name || "Customer"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={statusClass(invoice.status)}>
            {invoice.status}
          </Badge>
          {balanceDue > 0 && !["CANCELLED", "REFUNDED"].includes(invoice.status) && (
            <Button onClick={() => router.push(`/invoices/${invoice.id}/pay`)}>
              <Plus className="size-4" />
              Add payment
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="secondary" disabled title="PDF export will be wired after print layout is finalized">
            <Download className="size-4" />
            Download / print
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
        <div className="grid gap-8 md:grid-cols-2">
          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-[#6b707d]">Seller</p>
              <h2 className="text-xl font-semibold text-[#12141a]">{sellerName}</h2>
              <p className="text-sm text-[#6b707d]">{invoice.seller_legal_name || "-"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="GSTIN / Tax ID" value={invoice.seller_tax_id} />
              <Field label="State" value={invoice.seller_state} />
              <Field label="Country" value={invoice.seller_country} />
              <Field label="Email" value={invoice.seller_email} />
              <Field label="Phone" value={invoice.seller_phone} />
              <Field label="Template" value={invoice.invoice_template_key} />
            </div>
            <Field label="Address" value={invoice.seller_address} />
          </section>

          <section className="space-y-4 rounded-lg bg-[#f8f9fa] p-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-[#6b707d]">Bill to</p>
              <h2 className="text-xl font-semibold text-[#12141a]">{invoice.customer_name || "Customer"}</h2>
              <p className="text-sm text-[#6b707d]">{invoice.customer_email || "-"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer GSTIN" value={invoice.customer_gstin} />
              <Field label="Place of supply" value={invoice.customer_place_of_supply} />
              <Field label="Created" value={date(invoice.created_at)} />
              <Field label="Due date" value={date(invoice.due_date)} />
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Payment status" value={`${money(balanceDue)} due`} helper={`Paid ${money(paidAmount)}`} />
        <Metric label="Tax mode" value={taxMode} helper={`Round off ${invoice.round_off_enabled ? "enabled" : "disabled"}`} />
        <Metric label="Total" value={money(invoice.total)} helper={`Subtotal ${money(invoice.subtotal)} + tax ${money(invoice.tax)}`} />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>HSN/SAC</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.sku || "Manual line"}
                    {item.unit_of_measure ? ` - ${item.unit_of_measure}` : ""}
                  </div>
                </TableCell>
                <TableCell>{item.hsn_sac_code || "-"}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{money(item.unit_price)}</TableCell>
                <TableCell className="text-right">{money(item.taxable_value)}</TableCell>
                <TableCell className="text-right">
                  {money(item.tax_amount)}
                  <div className="text-xs text-muted-foreground">{item.tax_rate.toFixed(2)}%</div>
                </TableCell>
                <TableCell className="text-right font-medium">{money(item.line_total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4 rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-semibold">Tax summary</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Taxable value</TableHead>
                <TableHead className="text-right">Tax amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.tax_summary.map((tax, index) => (
                <TableRow key={`${tax.tax_component}-${tax.tax_rate}-${index}`}>
                  <TableCell>{tax.tax_component}</TableCell>
                  <TableCell className="text-right">{tax.tax_rate.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{money(tax.taxable_value)}</TableCell>
                  <TableCell className="text-right">{money(tax.tax_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="space-y-3 rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <TotalRow label="Subtotal" value={money(invoice.subtotal)} />
          <TotalRow label="Tax" value={money(invoice.tax)} />
          {invoice.discount_type && (
            <TotalRow label={`Discount (${invoice.discount_type})`} value={`-${money(invoice.discount_value)}`} muted />
          )}
          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{money(invoice.total)}</span>
            </div>
            <TotalRow label="Paid" value={money(paidAmount)} muted />
            <TotalRow label="Balance" value={money(balanceDue)} muted />
          </div>
        </section>
      </div>

      <section className="space-y-3 rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-lg font-semibold">Payment transactions</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPayments && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loadingPayments && payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No payments recorded
                  </TableCell>
                </TableRow>
              )}
              {!loadingPayments && payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{date(payment.paid_at)}</TableCell>
                  <TableCell>{payment.payment_method.replace("_", " ")}</TableCell>
                  <TableCell>{payment.reference_number || payment.gateway_provider || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass(payment.status)}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.note || "-"}</TableCell>
                  <TableCell className="text-right font-medium">{money(payment.amount, payment.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {(invoice.invoice_terms || invoice.invoice_footer) && (
        <section className="grid gap-4 md:grid-cols-2">
          <TextPanel title="Terms" value={invoice.invoice_terms} />
          <TextPanel title="Footer" value={invoice.invoice_footer} />
        </section>
      )}
    </div>
  )
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-[#6b707d]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#12141a]">{value}</p>
      <p className="text-sm text-[#6b707d]">{helper}</p>
    </div>
  )
}

function TotalRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-[#6b707d]" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function TextPanel({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-normal text-[#6b707d]">{title}</h2>
      <p className="whitespace-pre-wrap text-sm">{value || "-"}</p>
    </div>
  )
}
