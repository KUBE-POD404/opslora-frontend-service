"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { CheckCircle2, Eye, FileText, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"

type InvoiceTemplate = {
  key: string
  name: string
  description: string
  version: string
  supports_logo: boolean
  supports_tax_summary: boolean
  supports_bank_details: boolean
}

export default function InvoiceTemplatesPage() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadTemplates() {
      try {
        setLoading(true)
        const data = await apiFetch<InvoiceTemplate[]>("/invoices/templates")
        if (!cancelled) setTemplates(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load invoice templates")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTemplates()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6 text-[#e8edf4]">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
          <FileText className="size-4" />
          Document design
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f7f8fb]">
          Invoice templates
        </h1>
        <p className="max-w-2xl text-sm text-[#8790a0]">
          Choose how generated invoice PDFs should look. Opslora Default is used automatically until a different default is selected.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center rounded-lg border border-white/10 bg-[#141922]">
          <Loader2 className="size-6 animate-spin text-cyan-300" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <article
              key={template.key}
              className="rounded-lg border border-white/10 bg-[#141922] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
            >
              <TemplatePreview templateKey={template.key} compact />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#f7f8fb]">{template.name}</h2>
                    {template.key === "opslora_default" ? (
                      <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[#8790a0]">{template.description}</p>
                </div>
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-[#8790a0]">
                  v{template.version}
                </span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <TemplateCapability label="Logo" enabled={template.supports_logo} />
                <TemplateCapability label="Tax summary" enabled={template.supports_tax_summary} />
                <TemplateCapability label="Bank details" enabled={template.supports_bank_details} />
              </div>

              <Button
                variant="outline"
                className="mt-5 h-9 border-white/10 bg-white/[0.03] text-[#d9e2ee] hover:bg-white/[0.07]"
                onClick={() => setSelectedTemplate(template)}
              >
                <Eye className="size-4" />
                View template
              </Button>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-white/10 bg-[#0b0f15] text-[#e8edf4]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-cyan-300" />
              {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <TemplatePreview templateKey={selectedTemplate.key} />
              <aside className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                  Template notes
                </div>
                <p className="mt-3 text-sm text-[#aab3c2]">{selectedTemplate.description}</p>
                <div className="mt-5 space-y-2">
                  <TemplateCapability label="Organization logo" enabled={selectedTemplate.supports_logo} />
                  <TemplateCapability label="GST/tax summary" enabled={selectedTemplate.supports_tax_summary} />
                  <TemplateCapability label="Bank details block" enabled={selectedTemplate.supports_bank_details} />
                </div>
              </aside>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateCapability({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
      <CheckCircle2 className={enabled ? "size-4 text-emerald-300" : "size-4 text-[#4d5665]"} />
      <span className={enabled ? "text-[#d9e2ee]" : "text-[#667080]"}>{label}</span>
    </div>
  )
}

function TemplatePreview({ templateKey, compact = false }: { templateKey: string; compact?: boolean }) {
  if (templateKey === "opslora_compact") return <CompactTemplate compact={compact} />
  if (templateKey === "opslora_tax_detailed") return <TaxTemplate compact={compact} />
  if (templateKey === "opslora_service") return <ServiceTemplate compact={compact} />
  return <OpsloraDefaultTemplate compact={compact} />
}

function PreviewShell({
  compact,
  children,
  accent = "cyan",
}: {
  compact?: boolean
  children: ReactNode
  accent?: "cyan" | "amber" | "emerald" | "violet"
}) {
  const accentMap = {
    cyan: "from-cyan-300/80 to-blue-400/80",
    amber: "from-amber-300/90 to-orange-400/80",
    emerald: "from-emerald-300/80 to-teal-400/80",
    violet: "from-violet-300/80 to-fuchsia-400/80",
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border border-white/10 bg-[#070a0f] ${compact ? "mb-5 h-56" : "min-h-[680px]"
        }`}
    >
      <div className={`h-1.5 bg-gradient-to-r ${accentMap[accent]}`} />
      <div className={`${compact ? "scale-[0.48] origin-top-left p-8 w-[200%]" : "p-8"} text-[#141821]`}>
        <div className="min-h-[620px] rounded-sm bg-[#f8f5ec] p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  )
}

function OpsloraDefaultTemplate({ compact }: { compact?: boolean }) {
  return (
    <PreviewShell compact={compact} accent="cyan">
      <div className="flex items-start justify-between border-b border-[#d8d2c3] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0e2630] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Opslora
          </div>
          <h3 className="mt-5 text-4xl font-semibold tracking-tight">Invoice</h3>
          <p className="mt-2 text-sm text-[#6f6a5d]">Professional GST-ready default for most businesses.</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">Invoice #INV-2026-0042</div>
          <div className="mt-1 text-[#6f6a5d]">Issued Jun 12, 2026</div>
          <div className="text-[#6f6a5d]">Due Jun 27, 2026</div>
        </div>
      </div>
      <PreviewParties />
      <PreviewItems />
      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="rounded-md border border-[#d8d2c3] p-4 text-sm text-[#6f6a5d]">
          Payment accepted by bank transfer, UPI, or card. Thank you for your business.
        </div>
        <PreviewTotals />
      </div>
    </PreviewShell>
  )
}

function CompactTemplate({ compact }: { compact?: boolean }) {
  return (
    <PreviewShell compact={compact} accent="emerald">
      <div className="grid grid-cols-[1fr_auto] gap-6 border-b border-[#d8d2c3] pb-5">
        <div>
          <h3 className="text-3xl font-semibold">Compact Invoice</h3>
          <p className="mt-1 text-sm text-[#6f6a5d]">High-density layout for frequent shipments and repeat buyers.</p>
        </div>
        <div className="rounded-md bg-[#18372f] px-4 py-3 text-right text-sm text-emerald-50">
          <div>INV-2026-0042</div>
          <div className="opacity-75">Rs 24,780.00</div>
        </div>
      </div>
      <PreviewParties dense />
      <PreviewItems dense />
      <PreviewTotals />
    </PreviewShell>
  )
}

function TaxTemplate({ compact }: { compact?: boolean }) {
  return (
    <PreviewShell compact={compact} accent="amber">
      <div className="rounded-lg bg-[#2d2413] p-6 text-[#fff7df]">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Tax detailed</div>
        <h3 className="mt-3 text-4xl font-semibold">GST Invoice</h3>
        <p className="mt-2 text-sm text-amber-100/80">Designed for buyers who need tax breakup visible without opening attachments.</p>
      </div>
      <PreviewParties />
      <PreviewItems />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[#d8d2c3] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7d65]">Tax summary</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <span>CGST</span><span>9%</span><span className="text-right">Rs 1,890</span>
            <span>SGST</span><span>9%</span><span className="text-right">Rs 1,890</span>
            <span>Round off</span><span>-</span><span className="text-right">Rs 0</span>
          </div>
        </div>
        <PreviewTotals />
      </div>
    </PreviewShell>
  )
}

function ServiceTemplate({ compact }: { compact?: boolean }) {
  return (
    <PreviewShell compact={compact} accent="violet">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Service invoice</div>
          <h3 className="mt-3 text-4xl font-semibold">Monthly Retainer</h3>
        </div>
        <div className="h-16 w-16 rounded-2xl bg-[#28213f]" />
      </div>
      <PreviewParties />
      <div className="mt-8 rounded-lg border border-[#d8d2c3]">
        {["Platform support retainer", "Workflow consulting", "Implementation hours"].map((item, index) => (
          <div key={item} className="grid grid-cols-[1fr_90px_120px] gap-3 border-b border-[#d8d2c3] px-4 py-4 last:border-0">
            <span className="font-medium">{item}</span>
            <span className="text-right text-[#6f6a5d]">{index + 2} hrs</span>
            <span className="text-right font-semibold">Rs {(8000 + index * 3200).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <PreviewTotals />
      </div>
    </PreviewShell>
  )
}

function PreviewParties({ dense = false }: { dense?: boolean }) {
  return (
    <div className={`grid gap-4 ${dense ? "mt-5 grid-cols-2 text-xs" : "mt-8 md:grid-cols-2 text-sm"}`}>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7d65]">From</div>
        <div className="mt-2 font-semibold">Opslora Private Workspace</div>
        <div className="text-[#6f6a5d]">GSTIN 32ABCDE1234F1Z5</div>
        <div className="text-[#6f6a5d]">Trivandrum, Kerala</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7d65]">Bill to</div>
        <div className="mt-2 font-semibold">Aster Retail Co.</div>
        <div className="text-[#6f6a5d]">finance@aster.example</div>
        <div className="text-[#6f6a5d]">Bengaluru, Karnataka</div>
      </div>
    </div>
  )
}

function PreviewItems({ dense = false }: { dense?: boolean }) {
  const rows = [
    ["Inventory starter kit", "2", "Rs 7,500", "Rs 15,000"],
    ["Priority onboarding", "1", "Rs 6,000", "Rs 6,000"],
    ["Workflow automation", "3", "Rs 1,260", "Rs 3,780"],
  ]

  return (
    <div className={`mt-8 overflow-hidden rounded-lg border border-[#d8d2c3] ${dense ? "text-xs" : "text-sm"}`}>
      <div className="grid grid-cols-[1fr_70px_110px_120px] gap-3 bg-[#eee7d7] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f6a5d]">
        <span>Item</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span>
      </div>
      {rows.map(row => (
        <div key={row[0]} className="grid grid-cols-[1fr_70px_110px_120px] gap-3 border-t border-[#d8d2c3] px-4 py-3">
          <span className="font-medium">{row[0]}</span>
          <span className="text-right text-[#6f6a5d]">{row[1]}</span>
          <span className="text-right text-[#6f6a5d]">{row[2]}</span>
          <span className="text-right font-semibold">{row[3]}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewTotals() {
  return (
    <div className="rounded-md border border-[#d8d2c3] bg-[#fffdf6] p-4 text-sm">
      <div className="flex justify-between text-[#6f6a5d]"><span>Subtotal</span><span>Rs 24,780</span></div>
      <div className="mt-2 flex justify-between text-[#6f6a5d]"><span>Tax</span><span>Rs 3,780</span></div>
      <div className="mt-3 border-t border-[#d8d2c3] pt-3 text-lg font-semibold flex justify-between">
        <span>Total</span><span>Rs 28,560</span>
      </div>
    </div>
  )
}
