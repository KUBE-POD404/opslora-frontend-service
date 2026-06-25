/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, ReceiptText } from "lucide-react"
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

type OrderItem = {
  product_id?: number | null
  sku?: string | null
  product_name: string
  hsn_sac_code?: string | null
  unit_of_measure?: string | null
  quantity: number
  unit_price: number
  tax_rate?: number | null
}

type Order = {
  id: number
  customer_id: number
  status: string
  customer_name?: string | null
  customer_email?: string | null
  customer_gstin?: string | null
  customer_place_of_supply?: string | null
  billing_state?: string | null
  items: OrderItem[]
  total: number
}

type InvoiceTemplate = {
  key: string
  name: string
  description: string
  version: string
  supports_logo: boolean
  supports_tax_summary: boolean
  supports_bank_details: boolean
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function money(value: number) {
  return `Rs ${value.toFixed(2)}`
}

export default function CreateInvoicePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState("")
  const [discountType, setDiscountType] =
    useState<"NONE" | "FLAT" | "PERCENT">("NONE")
  const [discountValue, setDiscountValue] = useState(0)
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("opslora_default")
  const [saving, setSaving] = useState(false)

  const linePreview = useMemo(() => {
    if (!order) return []

    return order.items.map((item) => {
      const taxableValue = round(item.quantity * item.unit_price)
      const taxRate = Number(item.tax_rate || 0)
      const taxAmount = round((taxableValue * taxRate) / 100)

      return {
        ...item,
        taxRate,
        taxableValue,
        taxAmount,
        lineTotal: round(taxableValue + taxAmount),
      }
    })
  }, [order])

  const subtotal = round(linePreview.reduce((sum, item) => sum + item.taxableValue, 0))
  const tax = round(linePreview.reduce((sum, item) => sum + item.taxAmount, 0))

  let discountAmount = 0
  if (discountType === "FLAT") discountAmount = discountValue
  if (discountType === "PERCENT") {
    discountAmount = round((subtotal * discountValue) / 100)
  }
  if (discountAmount > subtotal) discountAmount = subtotal

  const total = round(subtotal + tax - discountAmount)

  useEffect(() => {
    if (discountType === "NONE") {
      setDiscountValue(0)
    }
  }, [discountType])

  useEffect(() => {
    if (!id) return

    async function loadOrder() {
      try {
        setLoading(true)
        const orderData = await apiFetch<Order>(`/orders/${id}`)
        setOrder(orderData)

        const [customerData, templateData] = await Promise.all([
          apiFetch<{ id: number; name: string }>(`/customers/${orderData.customer_id}`),
          apiFetch<InvoiceTemplate[]>("/invoices/templates"),
        ])
        setCustomerName(customerData.name)
        setTemplates(templateData)

        if (templateData[0]?.key) {
          setSelectedTemplateKey(templateData[0].key)
        }
      } catch (err: any) {
        toast.error(err.message)
        router.push("/orders")
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [id, router])

  async function handleCreateInvoice() {
    if (!id) return

    try {
      setSaving(true)

      await apiFetch(`/invoices/orders/${id}`, {
        method: "POST",
        body: JSON.stringify({
          discount_type: discountType === "NONE" ? null : discountType,
          discount_value: discountValue,
          invoice_template_key: selectedTemplateKey,
        }),
      })

      toast.success("Invoice created successfully")
      router.push("/invoices")
    } catch (err: any) {
      toast.error(err.message)
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

  if (!order) return null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#12141a]">Create Invoice</h1>
          <p className="text-sm text-[#6b707d]">
            Order #{order.id} - {order.customer_name || customerName}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/orders")}>
          Back to orders
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.16)] space-y-8">
        <div className="grid gap-3 rounded-lg border border-white/10 bg-[#f8f9fa] p-4 md:grid-cols-4">
          <PreviewMeta label="Order status" value={order.status} />
          <PreviewMeta label="Customer" value={order.customer_name || customerName} />
          <PreviewMeta label="GSTIN" value={order.customer_gstin || "-"} />
          <PreviewMeta
            label="Place of supply"
            value={order.customer_place_of_supply || order.billing_state || "-"}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>HSN/SAC</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linePreview.map((item, index) => (
              <TableRow key={index}>
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
                <TableCell className="text-right">{money(item.taxableValue)}</TableCell>
                <TableCell className="text-right">
                  {money(item.taxAmount)}
                  <div className="text-xs text-muted-foreground">
                    {item.taxRate.toFixed(2)}%
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {money(item.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[#636973]">Invoice template</h3>
                <p className="mt-1 text-xs text-[#6b707d]">
                  The selected template is snapshotted into this invoice.
                </p>
              </div>
              <Select value={selectedTemplateKey} onValueChange={setSelectedTemplateKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates
                .filter((template) => template.key === selectedTemplateKey)
                .map((template) => (
                  <div key={template.key} className="rounded-md border border-white/10 bg-[#f8f9fa] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[#12141a]">{template.name}</div>
                      <div className="text-xs text-[#6b707d]">v{template.version}</div>
                    </div>
                    <p className="mt-1 text-sm text-[#6b707d]">{template.description}</p>
                  </div>
                ))}
            </div>

            <div className="rounded-lg border border-white/10 p-4 space-y-4">
              <h3 className="text-sm font-medium text-[#636973]">Discount</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={discountType}
                    onValueChange={(value) => setDiscountType(value as typeof discountType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="FLAT">Flat</SelectItem>
                      <SelectItem value="PERCENT">Percent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(Number(event.target.value))}
                    disabled={discountType === "NONE"}
                    placeholder={discountType === "PERCENT" ? "Percentage %" : "Amount"}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 p-4 text-sm">
            <TotalRow label="Subtotal" value={money(subtotal)} />
            <TotalRow label="Tax" value={money(tax)} />
            <TotalRow label="Discount" value={`- ${money(discountAmount)}`} />
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push("/orders")}>
            Cancel
          </Button>
          <Button onClick={handleCreateInvoice} disabled={saving}>
            <ReceiptText className="size-4" />
            {saving ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-[#6b707d]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-[#12141a]">{value}</div>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#6b707d]">{label}</span>
      <span>{value}</span>
    </div>
  )
}
