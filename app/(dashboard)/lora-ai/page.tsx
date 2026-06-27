"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, ClipboardList, Loader2, MessageSquareText, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import type { OrganizationSettings } from "@/lib/organization-settings"


type ProviderHealth = {
  name: string
  configured: boolean
  available: boolean
  detail?: string | null
}

type ProvidersResponse = {
  primary: string
  providers: ProviderHealth[]
}

type Citation = {
  source_id: string
  chunk_id: string
  chunk_index: number
  source_uri?: string | null
  snippet: string
}

type ChatResponse = {
  provider: string
  model?: string | null
  response: string
  fallback_used: boolean
  conversation_id?: string | null
  citations: Citation[]
}

type KnowledgeResponse = {
  source_id: string
  chunks_created: number
  status: string
}

type ChatTurn = {
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  meta?: string
}

type Invoice = {
  id: number
  invoice_number?: string | null
  order_id: number
  customer_name?: string | null
  total: number
  status: string
  due_date?: string | null
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
  name?: string | null
  status?: string | null
}

type Payment = {
  id: number
  invoice_id: number
  amount: number
  currency?: string | null
  payment_method?: string | null
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

type OperationsBriefingResponse = {
  summary: {
    active_customers: number
    open_invoice_count: number
    overdue_invoice_count: number
    amount_due: number
    collected: number
    orders_to_invoice_count: number
    draft_order_count: number
    low_stock_count: number
  }
  overdue_invoices: Invoice[]
  orders_ready_to_invoice: Order[]
  low_stock_products: Array<{ product: Product; stock: StockBalance }>
  prompt_context: string
  recommended_actions: string[]
}

const promptLibrary = [
  "Generate today's operating briefing from the latest Opslora snapshot.",
  "Summarize open invoices and list the three most important follow-ups.",
  "Find confirmed orders that are ready to invoice.",
  "Explain which low-stock products could affect active orders.",
  "Draft customer follow-up messages for overdue invoices.",
]


function money(value: number | string | undefined | null) {
  return `Rs ${Number(value || 0).toFixed(2)}`
}


function topItems<T>(items: T[], count = 6) {
  return items.slice(0, count)
}

function renderInlineMarkdown(text: string) {
  const nodes: React.ReactNode[] = []
  let remaining = text
  let index = 0

  while (remaining.length > 0) {
    const start = remaining.indexOf("**")
    if (start === -1) {
      nodes.push(<span key={`text-${index}`}>{remaining}</span>)
      break
    }

    if (start > 0) {
      nodes.push(<span key={`text-${index}`}>{remaining.slice(0, start)}</span>)
      index += 1
    }

    const afterStart = start + 2
    const end = remaining.indexOf("**", afterStart)
    if (end === -1) {
      nodes.push(<span key={`text-${index}`}>{remaining.slice(start)}</span>)
      break
    }

    nodes.push(
      <strong key={`strong-${index}`} className="font-semibold text-[#f7f8fb]">
        {remaining.slice(afterStart, end)}
      </strong>
    )
    index += 1
    remaining = remaining.slice(end + 2)
  }

  return nodes
}

function addLineBreakBeforeMarker(text: string, marker: string) {
  return text.split(marker).join(`\n${marker}`)
}

function normalizeMarkdownLines(content: string) {
  return content
    .replaceAll("\r\n", "\n")
    .split("\n")
    .flatMap((rawLine) => {
      let line = rawLine
      for (const marker of ["### ", "## ", "1. **", "2. **", "3. **", "4. **", "5. **", "- **"]) {
        line = addLineBreakBeforeMarker(line, marker)
      }
      return line.split("\n")
    })
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "#")
}

function parseNumberedLine(line: string) {
  const dotIndex = line.indexOf(". ")
  if (dotIndex <= 0) return null
  const numberText = line.slice(0, dotIndex)
  if (!Array.from(numberText).every((char) => char >= "0" && char <= "9")) return null
  return { number: numberText, body: line.slice(dotIndex + 2) }
}

function MarkdownMessage({ content }: Readonly<{ content: string }>) {
  const lines = normalizeMarkdownLines(content)

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        if (line.startsWith("### ") || line.startsWith("## ")) {
          const heading = line.startsWith("### ") ? line.slice(4) : line.slice(3)
          return <h3 key={`${line}-${index}`} className="text-sm font-semibold uppercase tracking-[0.06em] text-indigo-100">{renderInlineMarkdown(heading)}</h3>
        }

        const numbered = parseNumberedLine(line)
        if (numbered) {
          return (
            <div key={`${line}-${index}`} className="flex gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-400/20 text-[11px] font-semibold text-indigo-100">{numbered.number}</span>
              <p>{renderInlineMarkdown(numbered.body)}</p>
            </div>
          )
        }

        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={`${line}-${index}`} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-200" />
              <p>{renderInlineMarkdown(line.slice(2))}</p>
            </div>
          )
        }

        return <p key={`${line}-${index}`}>{renderInlineMarkdown(line)}</p>
      })}
    </div>
  )
}


function briefingToSnapshotSummary(briefing: OperationsBriefingResponse) {
  return {
    activeCustomers: briefing.summary.active_customers,
    openInvoiceCount: briefing.summary.open_invoice_count,
    overdueInvoiceCount: briefing.summary.overdue_invoice_count,
    amountDue: briefing.summary.amount_due,
    collected: briefing.summary.collected,
    ordersToInvoiceCount: briefing.summary.orders_to_invoice_count,
    draftOrderCount: briefing.summary.draft_order_count,
    lowStockCount: briefing.summary.low_stock_count,
    overdueInvoices: briefing.overdue_invoices,
    ordersToInvoice: briefing.orders_ready_to_invoice,
    lowStockProducts: briefing.low_stock_products.map((item) => item.product),
    lowStockDetails: briefing.low_stock_products,
    recommendedActions: briefing.recommended_actions,
  }
}

type SnapshotSummary = ReturnType<typeof briefingToSnapshotSummary>



async function aiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  headers.set("Content-Type", "application/json")

  const res = await fetch(`/api/v1/ai${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = `Lora request failed (${res.status})`
    try {
      const body = await res.json()
      message = body.detail ?? body.error?.message ?? body.error ?? message
    } catch {}
    throw new Error(message)
  }

  return res.json()
}

async function loadOperationsSnapshot() {
  const [invoices, orders, customers, payments, products] = await Promise.all([
    apiFetch<Invoice[]>("/invoices/?limit=100"),
    apiFetch<Order[]>("/orders/?limit=100"),
    apiFetch<Customer[]>("/customers/?limit=100"),
    apiFetch<Payment[]>("/payments/"),
    apiFetch<Product[]>("/inventory/products?limit=100"),
  ])

  const stockResults = await Promise.allSettled(
    products.map((product) => apiFetch<StockBalance>(`/inventory/stock/${product.id}`))
  )
  const stockByProduct: Record<number, StockBalance> = {}

  stockResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      stockByProduct[products[index].id] = result.value
    }
  })

  return {
    generated_at: new Date().toISOString(),
    invoices,
    orders,
    customers,
    payments,
    products,
    stockByProduct,
  }
}



function canUserManageLoraConsent(user: ReturnType<typeof useAuth>["user"]) {
  const hasSettingsPermission = user?.permissions?.includes("organization.settings.update")
  const hasAdminRole = user?.roles?.some((role) => ["OWNER", "ADMIN"].includes(role.toUpperCase()))
  return Boolean(hasSettingsPermission || hasAdminRole)
}

function toOrganizationId(user: ReturnType<typeof useAuth>["user"]) {
  return String(user?.org_id ?? user?.organization_slug ?? "demo-org")
}

function toUserId(user: ReturnType<typeof useAuth>["user"]) {
  return String(user?.user_id ?? user?.email ?? "demo-user")
}

function ProviderStatusContent({
  loraConsentEnabled,
  providersLoading,
  providersError,
  providers,
}: Readonly<{
  loraConsentEnabled: boolean
  providersLoading: boolean
  providersError: string | null
  providers: ProvidersResponse | null
}>) {
  if (!loraConsentEnabled) {
    return (
      <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
        Provider checks are paused until an admin enables Lora AI consent.
      </div>
    )
  }

  if (providersLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[#cbd5e1]">
        <Loader2 className="size-4 animate-spin" /> Checking providers...
      </div>
    )
  }

  if (providersError) {
    return (
      <div className="rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-200">{providersError}</div>
    )
  }

  return providers?.providers.map((provider) => (
    <div key={provider.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm">
      <div>
        <div className="font-medium text-[#f7f8fb]">{provider.name}</div>
        <div className="text-xs text-[#8790a0]">{provider.detail ?? (provider.configured ? "configured" : "not configured")}</div>
      </div>
      <span className={provider.available ? "text-emerald-300" : "text-rose-300"}>
        {provider.available ? "online" : "offline"}
      </span>
    </div>
  ))
}

function LoraConsentGate({
  canManageLoraConsent,
  consentSaving,
  organizationSettingsLoaded,
  onEnableConsent,
}: Readonly<{
  canManageLoraConsent: boolean
  consentSaving: boolean
  organizationSettingsLoaded: boolean
  onEnableConsent: () => void
}>) {
  return (
    <section className="rounded-[18px] border border-amber-300/25 bg-amber-400/10 p-6 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-100/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-100">
            <ShieldCheck className="size-4" /> Admin consent required
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-amber-50">Lora AI is off for this organization.</h2>
          <p className="mt-3 text-sm leading-7 text-amber-50/80">
            To use Ask Lora or generate AI briefings, an admin must consent to share organization data with Lora AI. Until then, this page will not send live Opslora data, save operations snapshots, or call Lora chat for this organization.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-amber-50/75">
            <li>• Data that may be shared after consent: customers, orders, invoices, payments, products, inventory stock, and generated operations snapshots.</li>
            <li>• Consent is organization-wide and can be turned off later from Settings → Lora AI consent.</li>
            <li>• Existing deterministic app pages still work without Lora AI.</li>
          </ul>
        </div>
        <div className="w-full rounded-2xl border border-amber-200/20 bg-[#080b18]/60 p-4 lg:w-80">
          {canManageLoraConsent ? (
            <>
              <p className="text-sm leading-6 text-amber-50/80">As an admin, you can enable Lora AI for this organization.</p>
              <Button
                className="mt-4 w-full rounded-2xl bg-amber-200 text-[#17120a] hover:bg-amber-100"
                disabled={consentSaving || !organizationSettingsLoaded}
                onClick={onEnableConsent}
              >
                {consentSaving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                I consent, enable Lora AI
              </Button>
            </>
          ) : (
            <p className="text-sm leading-6 text-amber-50/80">Ask an organization admin to enable Lora AI consent in Settings → Lora AI consent.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default function LoraAiPage() { // NOSONAR - page orchestrates consent, provider status, and chat state; complex UI is split into child components
  const { user } = useAuth()
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [consentSaving, setConsentSaving] = useState(false)
  const [providers, setProviders] = useState<ProvidersResponse | null>(null)
  const [providersError, setProvidersError] = useState<string | null>(null)
  const [providersLoading, setProvidersLoading] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [message, setMessage] = useState(promptLibrary[0])
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotSummary, setSnapshotSummary] = useState<SnapshotSummary | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const organizationId = useMemo(() => toOrganizationId(user), [user])
  const userId = useMemo(() => toUserId(user), [user])
  const loraConsentEnabled = Boolean(organizationSettings?.lora_ai_enabled)
  const canManageLoraConsent = useMemo(() => canUserManageLoraConsent(user), [user])


  useEffect(() => {
    let cancelled = false

    async function loadOrganizationSettings() {
      try {
        setSettingsLoading(true)
        const settings = await apiFetch<OrganizationSettings>("/settings/organization")
        if (!cancelled) setOrganizationSettings(settings)
      } catch (error_) {
        if (!cancelled) setError(error_ instanceof Error ? error_.message : "Unable to load Lora AI consent settings")
      } finally {
        if (!cancelled) setSettingsLoading(false)
      }
    }

    loadOrganizationSettings()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProviders() {
      try {
        setProvidersLoading(true)
        setProvidersError(null)
        const data = await aiFetch<ProvidersResponse>("/providers")
        if (!cancelled) setProviders(data)
      } catch (error_) {
        if (!cancelled) setProvidersError(error_ instanceof Error ? error_.message : "Unable to load providers")
      } finally {
        if (!cancelled) setProvidersLoading(false)
      }
    }

    if (settingsLoading || !loraConsentEnabled) {
      setProvidersLoading(false)
      return () => {
        cancelled = true
      }
    }

    loadProviders()
    return () => {
      cancelled = true
    }
  }, [loraConsentEnabled, settingsLoading])


  async function generateDailyBriefing() {
    if (!loraConsentEnabled) {
      setError("Lora AI is disabled until an admin consents to share organization data with Lora AI.")
      return
    }

    setSnapshotLoading(true)
    setError(null)
    setNotice(null)

    try {
      const snapshot = await loadOperationsSnapshot()
      const briefing = await aiFetch<OperationsBriefingResponse>("/operations/briefing", {
        method: "POST",
        body: JSON.stringify({
          ...snapshot,
          stock_by_product: snapshot.stockByProduct,
          stockByProduct: undefined,
        }),
      })
      const content = briefing.prompt_context
      setSnapshotSummary(briefingToSnapshotSummary(briefing))

      const result = await aiFetch<KnowledgeResponse>("/knowledge/sources", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          user_id: userId,
          source_type: "operations_snapshot",
          title: `Opslora operations snapshot ${new Date(snapshot.generated_at).toLocaleString()}`,
          source_uri: `opslora://frontend/lora-ai/operations-snapshot/${snapshot.generated_at}`,
          content,
          visibility_scope: "organization",
          retention_policy: "short_lived_operations_snapshot",
        }),
      })

      setNotice(`Operations snapshot saved: ${result.chunks_created} chunk${result.chunks_created === 1 ? "" : "s"}. Asking Lora for a daily briefing...`)
      await askLora(
        [
          "Using the latest Opslora live operations snapshot, generate today's operating briefing.",
          "Treat the Snapshot facts below as authoritative and more important than general knowledge.",
          "Do not invent invoice numbers, customer names, order IDs, products, amounts, or due dates.",
          "If a section says None in the loaded snapshot, say there are no matching items and recommend monitoring/setup actions only.",
          "Prioritize overdue invoices, confirmed orders ready to invoice, and low-stock risk. Keep it concise and cite the snapshot.",
          "",
          "Snapshot facts:",
          content,
        ].join("\n")
      )
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Unable to generate operations briefing")
    } finally {
      setSnapshotLoading(false)
    }
  }

  async function askLora(nextMessage = message) {
    if (!loraConsentEnabled) {
      setError("Lora AI is disabled until an admin consents to share organization data with Lora AI.")
      return
    }

    const cleanMessage = nextMessage.trim()
    if (!cleanMessage) return

    setChatLoading(true)
    setError(null)
    setNotice(null)
    setMessage(cleanMessage)
    setChatTurns((turns) => [...turns, { role: "user", content: cleanMessage }])

    try {
      const result = await aiFetch<ChatResponse>("/chat", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          user_id: userId,
          message: cleanMessage,
          conversation_id: conversationId,
          use_fallback: true,
        }),
      })
      setConversationId(result.conversation_id ?? null)
      setChatTurns((turns) => [
        ...turns,
        {
          role: "assistant",
          content: result.response,
          citations: result.citations,
          meta: [result.provider, result.model, result.fallback_used ? "fallback" : null].filter(Boolean).join(" · "),
        },
      ])
    } catch (error_) {
      setChatTurns((turns) => turns.filter((_, index) => index !== turns.length - 1))
      setError(error_ instanceof Error ? error_.message : "Unable to ask Lora")
    } finally {
      setChatLoading(false)
    }
  }


  async function enableLoraConsent() {
    if (!organizationSettings || !canManageLoraConsent) return

    setConsentSaving(true)
    setError(null)
    setNotice(null)

    try {
      const updated = await apiFetch<OrganizationSettings>("/settings/organization", {
        method: "PUT",
        body: JSON.stringify({
          ...organizationSettings,
          lora_ai_enabled: true,
          organization_id: undefined,
          lora_ai_consent_at: undefined,
          lora_ai_consent_by_user_id: undefined,
        }),
      })
      setOrganizationSettings(updated)
      setNotice("Lora AI consent enabled for this organization. Ask Lora and live operations briefings are now available.")
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Unable to enable Lora AI consent")
    } finally {
      setConsentSaving(false)
    }
  }

  return (
    <div className="-m-4 min-h-[calc(100svh-var(--header-height))] bg-[#070b16] p-4 text-[#f7f8fb] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="p-5 md:p-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8790a0]">
                <Bot className="size-4" /> Lora AI workspace
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.06em] text-balance md:text-5xl">
                Opt in before Lora AI can use organization data.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9aa4b2] md:text-base">
                Lora AI is disabled by default. An organization admin must consent before Opslora shares live customers, orders, invoices, payments, inventory, or snapshots with Lora AI.
              </p>
            </div>
            <aside className="border-t border-white/10 bg-[#0d1220] p-5 lg:border-l lg:border-t-0 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8790a0]">Provider status</div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">Live Lora backend</h2>
                </div>
                <Sparkles className="size-5 text-indigo-300" />
              </div>
              <div className="mt-5 space-y-2">
                <ProviderStatusContent
                  loraConsentEnabled={loraConsentEnabled}
                  providersLoading={providersLoading}
                  providersError={providersError}
                  providers={providers}
                />
              </div>
            </aside>
          </div>
        </section>

        {(notice || error) && (
          <div className={`rounded-2xl border p-4 text-sm ${error ? "border-rose-300/25 bg-rose-400/10 text-rose-200" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"}`}>
            {error ?? notice}
          </div>
        )}


        {settingsLoading ? (
          <section className="rounded-[18px] border border-white/10 bg-white/[0.035] p-5 text-sm text-[#cbd5e1]">
            <div className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading Lora AI consent settings...</div>
          </section>
        ) : null}

        {!settingsLoading && !loraConsentEnabled ? (
          <LoraConsentGate
            canManageLoraConsent={canManageLoraConsent}
            consentSaving={consentSaving}
            organizationSettingsLoaded={Boolean(organizationSettings)}
            onEnableConsent={enableLoraConsent}
          />
        ) : null}

        {loraConsentEnabled ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[18px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <MessageSquareText className="size-5 text-indigo-300" />
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.03em]">Ask Lora</h2>
                <p className="text-sm text-[#8790a0]">Ask Lora about the current organization context and the latest operations snapshot.</p>
              </div>
            </div>

            <div className="mt-5 min-h-80 space-y-3 rounded-2xl border border-white/10 bg-[#050814] p-4">
              {chatTurns.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center text-sm text-[#8790a0]">
                  <Bot className="mb-3 size-8 text-indigo-300" />
                  Choose a prompt or ask Lora what needs attention today.
                </div>
              ) : (
                chatTurns.map((turn, index) => (
                  <div key={`${turn.role}-${index}`} className={turn.role === "user" ? "ml-auto max-w-[85%]" : "mr-auto max-w-[90%]"}>
                    <div className={turn.role === "user" ? "rounded-2xl bg-[#3f46d8] p-4 text-sm leading-6 text-white" : "rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-[#d9e2ee]"}>
                      {turn.role === "assistant" ? <MarkdownMessage content={turn.content} /> : turn.content}
                    </div>
                    {turn.meta ? <div className="mt-1 px-2 text-xs text-[#8790a0]">{turn.meta}</div> : null}
                    {turn.citations && turn.citations.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {turn.citations.map((citation) => (
                          <div key={citation.chunk_id} className="rounded-xl border border-indigo-300/20 bg-indigo-400/10 p-3 text-xs leading-5 text-indigo-100">
                            <div className="mb-1 font-semibold">Citation {citation.chunk_index + 1}</div>
                            {citation.snippet}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              {chatLoading ? (
                <div className="mr-auto inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[#cbd5e1]">
                  <Loader2 className="size-4 animate-spin" /> Lora is thinking...
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-24 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-[#f7f8fb] outline-none placeholder:text-[#8790a0] focus:border-indigo-300/40"
                placeholder="Ask Lora what needs attention today..."
              />
              <Button
                className="h-auto min-h-12 rounded-2xl bg-[#3f46d8] px-5 text-white hover:bg-[#4f57ef]"
                disabled={chatLoading}
                onClick={() => askLora()}
              >
                {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Ask
              </Button>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {promptLibrary.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left text-sm leading-6 text-[#d9e2ee] transition hover:border-indigo-300/30 hover:bg-indigo-400/10"
                  onClick={() => askLora(prompt)}
                  disabled={chatLoading}
                >
                  <span className="mr-2 text-[#8790a0]">Ask</span>{prompt}
                </button>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[18px] border border-indigo-300/20 bg-indigo-400/10 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
              <div className="flex items-center gap-3">
                <ClipboardList className="size-5 text-indigo-200" />
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.03em]">Daily operations briefing</h2>
                  <p className="text-sm text-indigo-100/75">Pull live Opslora data, save it as Lora context, and ask for the day&apos;s priorities.</p>
                </div>
              </div>
              {snapshotSummary ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs text-emerald-50">
                    <div className="font-semibold uppercase tracking-[0.08em] text-emerald-200/80">Deterministic snapshot summary</div>
                    <p className="mt-1 leading-5 text-emerald-50/80">
                      These metrics come directly from Opslora APIs before Lora writes commentary. Treat this panel as the source of truth for counts and amounts.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">Active customers</div><div className="mt-1 text-lg font-semibold">{snapshotSummary.activeCustomers}</div></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">Amount due</div><div className="mt-1 text-lg font-semibold">{money(snapshotSummary.amountDue)}</div></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">Open invoices</div><div className="mt-1 text-lg font-semibold">{snapshotSummary.openInvoiceCount}</div></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">Overdue</div><div className="mt-1 text-lg font-semibold">{snapshotSummary.overdueInvoiceCount}</div></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">To invoice</div><div className="mt-1 text-lg font-semibold">{snapshotSummary.ordersToInvoiceCount}</div></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">Low stock</div><div className="mt-1 text-lg font-semibold">{snapshotSummary.lowStockCount}</div></div>
                  </div>
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-50">
                    <div className="font-semibold text-amber-100">Recommended actions</div>
                    <p className="mt-1 text-amber-50/75">
                      Deterministic next steps from the structured briefing endpoint. Use these before Lora prose if the model wording conflicts.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {snapshotSummary.recommendedActions.map((action) => (
                        <li key={action}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-[#d9e2ee]">
                    <div className="font-semibold text-[#f7f8fb]">Top overdue/open invoices</div>
                    {snapshotSummary.overdueInvoices.length ? (
                      <ul className="mt-2 space-y-1">
                        {topItems(snapshotSummary.overdueInvoices, 3).map((invoice) => (
                          <li key={invoice.id}>Invoice {invoice.invoice_number ?? invoice.id} · {invoice.customer_name ?? "unknown customer"} · {money(invoice.total)} · {invoice.status}</li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-[#8790a0]">None in the loaded snapshot.</p>}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-[#d9e2ee]">
                    <div className="font-semibold text-[#f7f8fb]">Confirmed orders ready to invoice</div>
                    {snapshotSummary.ordersToInvoice.length ? (
                      <ul className="mt-2 space-y-1">
                        {topItems(snapshotSummary.ordersToInvoice, 3).map((order) => (
                          <li key={order.id}>Order {order.id} · {order.customer_name ?? `customer ${order.customer_id}`} · {money(order.total)}</li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-[#8790a0]">None in the loaded snapshot.</p>}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-[#d9e2ee]">
                    <div className="font-semibold text-[#f7f8fb]">Low-stock products</div>
                    {snapshotSummary.lowStockDetails.length ? (
                      <ul className="mt-2 space-y-1">
                        {topItems(snapshotSummary.lowStockDetails, 3).map(({ product, stock }) => (
                          <li key={product.id}>{product.name} · {product.sku} · on hand {stock.quantity_on_hand} / threshold {stock.low_stock_threshold}</li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-[#8790a0]">None in the loaded snapshot.</p>}
                  </div>
                </div>
              ) : null}
              <Button
                className="mt-5 w-full rounded-2xl bg-indigo-300 text-[#080b18] hover:bg-indigo-200"
                disabled={snapshotLoading || chatLoading}
                onClick={generateDailyBriefing}
              >
                {snapshotLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Generate briefing from live data
              </Button>
            </section>

          </aside>
        </div>
        ) : null}
      </div>
    </div>
  )
}
