"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, ClipboardList, Loader2, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react"

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
    <div className="-m-4 min-h-[calc(100svh-var(--header-height))] bg-[#050814] p-3 text-[#f7f8fb] md:p-5">
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[calc(100svh-var(--header-height)-2.5rem)] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#080c18] shadow-[0_18px_70px_rgba(0,0,0,0.32)]">
          <header className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-400/10 text-indigo-200">
                <Bot className="size-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-[-0.02em] text-[#f7f8fb]">Lora AI terminal</h1>
                <p className="text-xs text-[#8790a0]">Hermes CLI feel, ChatGPT-style conversation, Opslora-aware answers.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#9aa4b2]">
              <span className={loraConsentEnabled ? "size-2 rounded-full bg-emerald-300" : "size-2 rounded-full bg-amber-300"} />
              {loraConsentEnabled ? "Organization data enabled" : "Chat locked until admin consent"}
            </div>
          </header>

          {(notice || error) && (
            <div className={`mx-4 mt-4 rounded-2xl border p-3 text-sm ${error ? "border-rose-300/25 bg-rose-400/10 text-rose-200" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"}`}>
              {error ?? notice}
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {settingsLoading ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[#cbd5e1]"><Loader2 className="size-4 animate-spin" /> Loading Lora AI settings...</div>
            ) : null}

            {!settingsLoading && !loraConsentEnabled ? (
              <div className="mx-auto mt-8 max-w-2xl rounded-[20px] border border-amber-300/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-50">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-amber-100"><ShieldCheck className="size-4" /> Admin consent needed</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-amber-50">Lora is ready, but organization data sharing is off.</h2>
                <p className="mt-2 text-amber-50/75">Enable consent only when this organization is ready to share Opslora customers, orders, invoices, payments, inventory, and operations snapshots with Lora AI.</p>
                {canManageLoraConsent ? (
                  <Button
                    className="mt-4 rounded-2xl bg-amber-200 text-[#17120a] hover:bg-amber-100"
                    disabled={consentSaving || !organizationSettings}
                    onClick={enableLoraConsent}
                  >
                    {consentSaving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                    Enable Lora AI for this organization
                  </Button>
                ) : (
                  <p className="mt-4 text-xs text-amber-50/70">Ask an organization admin to enable Lora AI in Settings.</p>
                )}
              </div>
            ) : null}

            {loraConsentEnabled && chatTurns.length === 0 ? (
              <div className="mx-auto mt-10 max-w-2xl text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-[20px] border border-indigo-300/20 bg-indigo-400/10 text-indigo-200"><Sparkles className="size-6" /></div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#f7f8fb]">Ask Lora what needs attention.</h2>
                <p className="mt-2 text-sm leading-6 text-[#9aa4b2]">Use the prompt line below like a terminal, or generate a live operations briefing first.</p>
              </div>
            ) : null}

            {loraConsentEnabled ? chatTurns.map((turn, index) => (
              <div key={`${turn.role}-${index}`} className={turn.role === "user" ? "ml-auto max-w-[82%]" : "mr-auto max-w-[88%]"}>
                <div className={turn.role === "user" ? "rounded-[20px] bg-[#3f46d8] p-4 text-sm leading-6 text-white" : "rounded-[20px] border border-white/10 bg-white/[0.045] p-4 font-mono text-sm leading-6 text-[#d9e2ee]"}>
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
            )) : null}

            {chatLoading ? (
              <div className="mr-auto inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-mono text-sm text-[#cbd5e1]"><Loader2 className="size-4 animate-spin" /> lora is thinking...</div>
            ) : null}
          </div>

          <div className="border-t border-white/10 bg-[#070b16] p-3">
            <div className="flex flex-col gap-2 rounded-[18px] border border-white/10 bg-[#030712] p-2 md:flex-row md:items-end">
              <label className="flex flex-1 items-start gap-2 px-2 py-1 font-mono text-sm text-[#9aa4b2]">
                <span className="pt-2 text-emerald-300">hermes$</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-12 flex-1 resize-none bg-transparent py-2 text-[#f7f8fb] outline-none placeholder:text-[#6f7887]"
                  placeholder="Ask Lora what needs attention today..."
                  disabled={!loraConsentEnabled || chatLoading}
                />
              </label>
              <Button
                className="rounded-2xl bg-[#3f46d8] px-5 text-white hover:bg-[#4f57ef]"
                disabled={!loraConsentEnabled || chatLoading}
                onClick={() => askLora()}
              >
                {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send
              </Button>
            </div>
            {loraConsentEnabled ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {promptLibrary.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-[#cbd5e1] transition hover:border-indigo-300/30 hover:bg-indigo-400/10"
                    onClick={() => askLora(prompt)}
                    disabled={chatLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8790a0]">Provider</div>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#f7f8fb]">Backend status</h2>
              </div>
              <Sparkles className="size-5 text-indigo-300" />
            </div>
            <div className="mt-4 space-y-2">
              <ProviderStatusContent loraConsentEnabled={loraConsentEnabled} providersLoading={providersLoading} providersError={providersError} providers={providers} />
            </div>
          </section>

          {loraConsentEnabled ? (
            <section className="rounded-[20px] border border-indigo-300/20 bg-indigo-400/10 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-3">
                <ClipboardList className="size-5 text-indigo-200" />
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.03em] text-[#f7f8fb]">Operations briefing</h2>
                  <p className="text-xs text-indigo-100/75">Refresh live Opslora facts before asking Lora.</p>
                </div>
              </div>
              {snapshotSummary ? (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">Amount due</div><div className="mt-1 text-lg font-semibold">{money(snapshotSummary.amountDue)}</div></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">Open invoices</div><div className="mt-1 text-lg font-semibold">{snapshotSummary.openInvoiceCount}</div></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">To invoice</div><div className="mt-1 text-lg font-semibold">{snapshotSummary.ordersToInvoiceCount}</div></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[#8790a0]">Low stock</div><div className="mt-1 text-lg font-semibold">{snapshotSummary.lowStockCount}</div></div>
                </div>
              ) : null}
              {snapshotSummary?.recommendedActions.length ? (
                <ul className="mt-4 space-y-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-50">
                  {snapshotSummary.recommendedActions.map((action) => <li key={action}>• {action}</li>)}
                </ul>
              ) : null}
              <Button
                className="mt-4 w-full rounded-2xl bg-indigo-300 text-[#080b18] hover:bg-indigo-200"
                disabled={snapshotLoading || chatLoading}
                onClick={generateDailyBriefing}
              >
                {snapshotLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Generate live briefing
              </Button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
