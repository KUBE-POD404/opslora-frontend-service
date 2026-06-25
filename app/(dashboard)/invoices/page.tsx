/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Eye, Loader2, RotateCcw, Search, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiFetch } from "@/lib/api"
import { MetricCard, OperationsPage, Panel, PanelToolbar } from "@/components/operations/page-chrome"

type Invoice = {
  id: number
  invoice_number?: string | null
  order_id: number
  customer_name?: string | null
  subtotal: number
  tax: number
  total: number
  status: string
  due_date: string
  created_at: string
}

const cancellableStatuses = ["UNPAID"]

function money(value: number) {
  return `Rs ${Number(value || 0).toFixed(2)}`
}

function formatDate(value: string) {
  if (!value) return "-"
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusClass(status: string) {
  if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "PARTIALLY_PAID") return "border-blue-200 bg-blue-50 text-blue-700"
  if (status === "UNPAID") return "border-amber-200 bg-amber-50 text-amber-300"
  if (status === "REFUNDED") return "border-slate-200 bg-slate-50 text-slate-600"
  if (status === "CANCELLED") return "border-red-200 bg-red-50 text-red-700"

  return "border-slate-200 bg-slate-50 text-slate-600"
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState<Invoice | null>(null)
  const [refundReason, setRefundReason] = useState("")
  const [refunding, setRefunding] = useState(false)
  const limit = 20
  const router = useRouter()

  const loadInvoices = useCallback(async function loadInvoices(currentPage = page) {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
      })

      const invoiceData = await apiFetch<Invoice[]>(`/invoices/?${params.toString()}`)
      setInvoices(invoiceData)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const filteredInvoices = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return invoices.filter((invoice) => {
      if (statusFilter !== "ALL" && invoice.status !== statusFilter) return false
      if (!needle) return true

      return [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.order_id,
        invoice.id,
        invoice.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [invoices, query, statusFilter])

  const metrics = useMemo(() => {
    return {
      open: invoices.filter((invoice) =>
        ["UNPAID", "PARTIALLY_PAID"].includes(invoice.status)
      ).length,
      paid: invoices.filter((invoice) => invoice.status === "PAID").length,
      amountDue: invoices
        .filter((invoice) => ["UNPAID", "PARTIALLY_PAID"].includes(invoice.status))
        .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    }
  }, [invoices])

  async function cancelInvoice(id: number) {
    try {
      const updated = await apiFetch<Invoice>(`/invoices/${id}/cancel`, {
        method: "POST",
      })

      setInvoices((current) =>
        current.map((invoice) => (invoice.id === updated.id ? updated : invoice))
      )

      toast.success("Invoice cancelled")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleRefund() {
    if (!refundTarget) return

    try {
      setRefunding(true)

      await apiFetch(`/payments/refund/${refundTarget.id}`, {
        method: "POST",
        body: JSON.stringify({
          amount: refundTarget.total,
          reason: refundReason || null,
        }),
      })

      toast.success("Invoice refunded")
      setInvoices((current) =>
        current.map((invoice) =>
          invoice.id === refundTarget.id
            ? { ...invoice, status: "REFUNDED" }
            : invoice
        )
      )
      setRefundOpen(false)
      setRefundTarget(null)
      setRefundReason("")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRefunding(false)
    }
  }

  return (
    <OperationsPage
      eyebrow="Receivables"
      title="Keep invoices, due dates, and payment actions visible."
      description="Track what is unpaid, what has been collected, and which invoices need action."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Open invoices" value={metrics.open} helper="Need payment" tone={metrics.open > 0 ? "warn" : "neutral"} />
        <MetricCard label="Paid invoices" value={metrics.paid} helper="Collected" tone="ok" />
        <MetricCard label="Amount due" value={money(metrics.amountDue)} helper="Open total" tone="warn" />
      </div>

      <Panel>
        <PanelToolbar>
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b707d]" />
            <Input
              className="h-10 rounded-[9px] border-white/10 bg-white/[0.04] pl-9"
              placeholder="Search invoice, customer, or order"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 rounded-[9px] border-white/10 bg-white/[0.04] md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partially paid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </PanelToolbar>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-[#6b707d]" />
                </TableCell>
              </TableRow>
            )}

            {!loading && filteredInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="font-medium text-[#12141a]">No invoices found</div>
                  <div className="text-sm text-[#6b707d]">
                    Confirm an order and create an invoice to start collecting payments.
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="font-medium text-[#12141a]">
                      {invoice.invoice_number || `#${invoice.id}`}
                    </div>
                    <div className="text-xs text-[#6b707d]">
                      Created {formatDate(invoice.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>#{invoice.order_id}</TableCell>
                  <TableCell>{invoice.customer_name || "-"}</TableCell>
                  <TableCell>{money(invoice.total)}</TableCell>
                  <TableCell>
                    <Badge className={statusClass(invoice.status)}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(invoice.due_date)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        <Eye className="size-3.5" />
                        View
                      </Button>
                      {(invoice.status === "UNPAID" ||
                        invoice.status === "PARTIALLY_PAID") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/invoices/${invoice.id}/pay`)}
                        >
                          <CreditCard className="size-3.5" />
                          Add payment
                        </Button>
                      )}
                      {invoice.status === "PAID" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRefundTarget(invoice)
                            setRefundOpen(true)
                          }}
                        >
                          <RotateCcw className="size-3.5" />
                          Refund
                        </Button>
                      )}
                      {cancellableStatuses.includes(invoice.status) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelInvoice(invoice.id)}
                        >
                          <X className="size-3.5" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Panel>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault()
                if (page > 1) setPage((current) => current - 1)
              }}
            />
          </PaginationItem>

          <PaginationItem>
            <PaginationLink href="#" isActive>
              {page}
            </PaginationLink>
          </PaginationItem>

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault()
                if (invoices.length === limit) setPage((current) => current + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund invoice</DialogTitle>
          </DialogHeader>

          {refundTarget && (
            <div className="space-y-4">
              <div className="rounded-md border border-[#e0e4eb] bg-[#f8f9fa] p-4 text-sm">
                <div className="font-medium text-[#12141a]">
                  {refundTarget.invoice_number || `Invoice #${refundTarget.id}`}
                </div>
                <div className="text-[#6b707d]">Refund amount: {money(refundTarget.total)}</div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[#636973]">
                  Refund reason
                </label>
                <textarea
                  className="min-h-24 w-full rounded-md border border-[#d8dde6] bg-white/[0.04] p-3 text-sm outline-none focus:border-[#9aa3b2]"
                  placeholder="Optional reason for refund"
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRefundOpen(false)
                    setRefundTarget(null)
                    setRefundReason("")
                  }}
                >
                  Cancel
                </Button>

                <Button variant="destructive" disabled={refunding} onClick={handleRefund}>
                  {refunding ? "Refunding..." : "Confirm refund"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OperationsPage>
  )
}
