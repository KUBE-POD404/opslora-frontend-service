"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

type Invoice = {
  id: number
  invoice_number?: string | null
  total: number
  status: string
  customer_name?: string | null
  due_date: string
}

type Payment = {
  id: number
  amount: number
  currency: string
  payment_method: string
  status: string
  reference_number?: string | null
  gateway_provider?: string | null
  paid_at: string
}

type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE"

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

export default function AddPaymentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [gatewayProvider, setGatewayProvider] = useState("")
  const [gatewayPaymentId, setGatewayPaymentId] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const inv = await apiFetch<Invoice>(`/invoices/${id}`)
        const pays = await apiFetch<Payment[]>(`/payments/invoice/${id}`)

        setInvoice(inv)
        setPayments(pays)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load invoice")
        router.push("/invoices")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, router])

  const totalPaid = useMemo(
    () =>
      payments
        .filter((payment) => payment.status !== "REFUNDED")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  )
  const remaining = invoice ? Math.max(invoice.total - totalPaid, 0) : 0

  useEffect(() => {
    if (remaining > 0 && !amount) {
      setAmount(String(remaining.toFixed(2)))
    }
  }, [amount, remaining])

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!invoice) return

    const paymentAmount = Number(amount)
    if (paymentAmount <= 0) {
      toast.error("Enter a valid payment amount")
      return
    }
    if (paymentAmount > remaining) {
      toast.error("Payment cannot exceed remaining balance")
      return
    }

    try {
      setSaving(true)

      await apiFetch("/payments/pay", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: paymentAmount,
          payment_method: method,
          currency: "INR",
          reference_number: referenceNumber || null,
          gateway_provider: gatewayProvider || null,
          gateway_payment_id: gatewayPaymentId || null,
          note: note || null,
        }),
      })

      toast.success("Payment added")
      router.push(`/invoices/${invoice.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add payment")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!invoice) return null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" className="-ml-3 h-8" onClick={() => router.push(`/invoices/${invoice.id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to invoice
          </Button>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Add Payment</h1>
          <p className="text-sm text-muted-foreground">
            {invoice.invoice_number || `Invoice #${invoice.id}`} - {invoice.customer_name || "Customer"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div className="text-muted-foreground">Due date</div>
          <div className="font-medium">{date(invoice.due_date)}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Invoice total" value={money(invoice.total)} />
        <Metric label="Paid" value={money(totalPaid)} />
        <Metric label="Remaining" value={money(remaining)} tone={remaining > 0 ? "warn" : "ok"} />
      </div>

      {payments.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{date(payment.paid_at)}</TableCell>
                  <TableCell>{payment.payment_method.replace("_", " ")}</TableCell>
                  <TableCell>{payment.reference_number || payment.gateway_provider || "-"}</TableCell>
                  <TableCell>{payment.status}</TableCell>
                  <TableCell className="text-right">{money(payment.amount, payment.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <form className="rounded-lg border border-border bg-muted/40 p-6" onSubmit={handlePay}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Payment method">
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Amount">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              max={remaining}
            />
          </Field>

          <Field label="Reference number">
            <Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
          </Field>

          <Field label="Gateway provider">
            <Input
              value={gatewayProvider}
              onChange={(event) => setGatewayProvider(event.target.value)}
              placeholder={method === "ONLINE" ? "Razorpay, Stripe, etc." : ""}
            />
          </Field>

          <Field label="Gateway payment id">
            <Input value={gatewayPaymentId} onChange={(event) => setGatewayPaymentId(event.target.value)} />
          </Field>

          <Field label="Note">
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/invoices/${invoice.id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || remaining <= 0}>
            <CreditCard className="size-4" />
            {saving ? "Processing..." : "Add Payment"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "ok" | "warn"
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-foreground"

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}
