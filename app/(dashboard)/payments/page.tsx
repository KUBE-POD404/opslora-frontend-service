/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { CreditCard, Loader2, ReceiptText, Search } from "lucide-react"
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
import { Label } from "@/components/ui/label"
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

type Payment = {
  id: number
  invoice_id: number
  customer_id?: number | null
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

type PaymentTransaction = {
  id: number
  payment_id?: number | null
  invoice_id: number
  event_type: string
  status: string
  amount?: number | null
  currency: string
  provider?: string | null
  provider_event_id?: string | null
  created_at: string
}

function money(payment: Pick<Payment, "currency" | "amount">) {
  const prefix = payment.currency === "INR" ? "Rs" : payment.currency
  return `${prefix} ${Number(payment.amount || 0).toFixed(2)}`
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("ALL")
  const [method, setMethod] = useState("ALL")
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")

  const loadPayments = useCallback(async function loadPayments() {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (status !== "ALL") params.set("status", status)
      if (method !== "ALL") params.set("payment_method", method)

      const paymentData = await apiFetch<Payment[]>(
        `/payments/${params.size ? `?${params.toString()}` : ""}`
      )

      setPayments(paymentData)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [method, status])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const filteredPayments = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return payments

    return payments.filter((payment) =>
      [
        payment.id,
        payment.invoice_id,
        payment.customer_id,
        payment.reference_number,
        payment.gateway_provider,
        payment.status,
        payment.payment_method,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    )
  }, [payments, query])

  const metrics = useMemo(() => {
    const settled = payments.filter((payment) =>
      ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status)
    )
    const refunded = payments.filter((payment) =>
      ["PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status)
    )
    const amount = settled.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

    return {
      amount,
      count: payments.length,
      settled: settled.length,
      refunded: refunded.length,
    }
  }, [payments])

  async function openPayment(payment: Payment) {
    setSelectedPayment(payment)
    setTransactions([])
    setTransactionsLoading(true)

    try {
      const data = await apiFetch<PaymentTransaction[]>(`/payments/${payment.id}/transactions`)
      setTransactions(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setTransactionsLoading(false)
    }
  }

  function openRefund(payment: Payment) {
    setSelectedPayment(payment)
    setRefundAmount(String(payment.amount))
    setRefundReason("")
    setRefundOpen(true)
  }

  async function handleRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedPayment) return
    if (!refundAmount || Number(refundAmount) <= 0) {
      toast.error("Enter a valid refund amount")
      return
    }

    try {
      setSaving(true)
      await apiFetch(`/payments/${selectedPayment.id}/refund`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(refundAmount),
          reason: refundReason || null,
          gateway_refund_id: null,
        }),
      })

      toast.success("Refund completed")
      setRefundOpen(false)
      await loadPayments()
      await openPayment(selectedPayment)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <OperationsPage
      eyebrow="Payments"
      title="Reconcile cash, refunds, and receipt history."
      description="See collected money, settlement status, refunds, and the full transaction trail."
      primaryAction={(
        <Button variant="outline" className="h-10 rounded-[9px] border-white/10 bg-white/[0.04]" onClick={loadPayments}>
          <CreditCard className="size-4" />
          Refresh
        </Button>
      )}
      showHero={false}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Collected" value={`Rs ${metrics.amount.toFixed(2)}`} helper="Successful receipts" tone="ok" />
        <MetricCard label="Payments" value={metrics.count} helper="Total records" />
        <MetricCard label="Settled" value={metrics.settled} helper="Ready to reconcile" tone="ok" />
        <MetricCard label="Refunded" value={metrics.refunded} helper="Needs review" tone={metrics.refunded > 0 ? "warn" : "neutral"} />
      </div>

      <Panel>
        <PanelToolbar>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b707d]" />
            <Input
              className="h-10 rounded-[9px] border-white/10 bg-white/[0.04] pl-9"
              placeholder="Search payment, invoice, or reference"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 rounded-[9px] border-white/10 bg-white/[0.04] sm:w-[190px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                <SelectItem value="PARTIALLY_REFUNDED">Partially refunded</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-10 rounded-[9px] border-white/10 bg-white/[0.04] sm:w-[180px]">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All methods</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PanelToolbar>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-[#6b707d]" />
                </TableCell>
              </TableRow>
            )}

            {!loading && filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-[#6b707d]">
                  No payments found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium text-[#12141a]">
                    #{payment.id}
                    <div className="text-xs font-normal text-[#6b707d]">
                      {payment.payment_type}
                    </div>
                  </TableCell>
                  <TableCell>#{payment.invoice_id}</TableCell>
                  <TableCell>{payment.customer_id ? `#${payment.customer_id}` : "-"}</TableCell>
                  <TableCell>{payment.payment_method.replace("_", " ")}</TableCell>
                  <TableCell>{payment.reference_number || payment.gateway_provider || "-"}</TableCell>
                  <TableCell>{money(payment)}</TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell>{new Date(payment.paid_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openPayment(payment)}>
                        <ReceiptText className="size-3.5" />
                        Details
                      </Button>
                      {payment.status !== "REFUNDED" && (
                        <Button size="sm" variant="secondary" onClick={() => openRefund(payment)}>
                          Refund
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Panel>

      <Dialog open={!!selectedPayment && !refundOpen} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment #{selectedPayment?.id}</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-lg border border-[#e0e4eb] bg-[#f8f9fa] p-4 md:grid-cols-3">
                <Detail label="Invoice" value={`#${selectedPayment.invoice_id}`} />
                <Detail label="Amount" value={money(selectedPayment)} />
                <Detail label="Method" value={selectedPayment.payment_method.replace("_", " ")} />
                <Detail label="Reference" value={selectedPayment.reference_number || "-"} />
                <Detail label="Provider" value={selectedPayment.gateway_provider || "-"} />
                <Detail label="Status" value={<StatusBadge status={selectedPayment.status} />} />
              </div>
              <div className="rounded-lg border border-[#e0e4eb]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Provider event</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center">
                          <Loader2 className="mx-auto size-5 animate-spin text-[#6b707d]" />
                        </TableCell>
                      </TableRow>
                    )}
                    {!transactionsLoading && transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-[#6b707d]">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    )}
                    {!transactionsLoading &&
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.event_type}</TableCell>
                          <TableCell>{transaction.status}</TableCell>
                          <TableCell>
                            {transaction.amount == null
                              ? "-"
                              : `${transaction.currency === "INR" ? "Rs" : transaction.currency} ${Number(transaction.amount).toFixed(2)}`}
                          </TableCell>
                          <TableCell>{transaction.provider_event_id || "-"}</TableCell>
                          <TableCell>{new Date(transaction.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund payment #{selectedPayment?.id}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleRefund}>
            <Field label="Amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
            </Field>
            <Field label="Reason">
              <Input value={refundReason} onChange={(event) => setRefundReason(event.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRefundOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Refunding..." : "Refund payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium text-[#636973]">{label}</Label>
      {children}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-[#6b707d]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[#12141a]">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className = status.includes("REFUNDED")
    ? "border-amber-200 bg-amber-50 text-amber-300"
    : status === "SUCCEEDED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-600"

  return <Badge className={className}>{status.replace("_", " ")}</Badge>
}
