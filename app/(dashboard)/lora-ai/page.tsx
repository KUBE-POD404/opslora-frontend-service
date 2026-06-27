"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, ClipboardList, Loader2, MessageSquareText, RefreshCw, Send, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"

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

type OperationsSnapshot = {
  generated_at: string
  invoices: Invoice[]
  orders: Order[]
  customers: Customer[]
  payments: Payment[]
  products: Product[]
  stockByProduct: Record<number, StockBalance>
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

function shortDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
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

function summarizeOperationsSnapshot(snapshot: OperationsSnapshot) {
  const openInvoiceStatuses = new Set(["UNPAID", "PARTIALLY_PAID", "OVERDUE"])
  const collectibleInvoices = snapshot.invoices.filter((invoice) => openInvoiceStatuses.has(invoice.status))
  const overdueInvoices = collectibleInvoices.filter((invoice) => {
    if (invoice.status === "OVERDUE") return true
    if (!invoice.due_date) return false
    return new Date(invoice.due_date).getTime() < Date.now()
  })
  const orderIdsWithInvoices = new Set(snapshot.invoices.map((invoice) => invoice.order_id))
  const ordersToInvoice = snapshot.orders.filter((order) => order.status === "CONFIRMED" && !orderIdsWithInvoices.has(order.id))
  const draftOrders = snapshot.orders.filter((order) => order.status === "CREATED")
  const lowStockProducts = snapshot.products.filter((product) => {
    const stock = snapshot.stockByProduct[product.id]
    return stock && Number(stock.quantity_on_hand) <= Number(stock.low_stock_threshold)
  })
  const lowStockDetails = lowStockProducts.map((product) => ({
    product,
    stock: snapshot.stockByProduct[product.id],
  }))
  const successfulPayments = snapshot.payments.filter((payment) => ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status))

  return {
    activeCustomers: snapshot.customers.filter((customer) => customer.status !== "INACTIVE").length,
    openInvoiceCount: collectibleInvoices.length,
    overdueInvoiceCount: overdueInvoices.length,
    amountDue: collectibleInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    collected: successfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    ordersToInvoiceCount: ordersToInvoice.length,
    draftOrderCount: draftOrders.length,
    lowStockCount: lowStockProducts.length,
    overdueInvoices,
    ordersToInvoice,
    lowStockProducts,
    lowStockDetails,
  }
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

function formatOperationsKnowledge(snapshot: OperationsSnapshot) {
  const summary = summarizeOperationsSnapshot(snapshot)
  const openInvoiceStatuses = new Set(["UNPAID", "PARTIALLY_PAID", "OVERDUE"])
  const openInvoices = snapshot.invoices.filter((invoice) => openInvoiceStatuses.has(invoice.status))
  const stockLine = (product: Product) => {
    const stock = snapshot.stockByProduct[product.id]
    return `${product.name} (${product.sku}) on hand ${stock ? stock.quantity_on_hand : "unknown"}, threshold ${stock ? stock.low_stock_threshold : "unknown"}`
  }

  const overdueLines = topItems(summary.overdueInvoices.length ? summary.overdueInvoices : openInvoices).map((invoice) =>
    `- Invoice ${invoice.invoice_number ?? invoice.id} for ${invoice.customer_name ?? "unknown customer"}: ${money(invoice.total)}, status ${invoice.status}, due ${shortDate(invoice.due_date)}.`
  )
  const orderLines = topItems(summary.ordersToInvoice).map((order) => {
    const customerName = order.customer_name ?? `customer ${order.customer_id}`
    return `- Order ${order.id} for ${customerName}: ${money(order.total)}, created ${shortDate(order.created_at)}.`
  })
  const lowStockLines = topItems(summary.lowStockProducts).map((product) => `- ${stockLine(product)}.`)

  return [
    `Opslora live operations snapshot generated at ${snapshot.generated_at}.`,
    "This snapshot is authoritative for the loaded organization window. Do not invent invoices, orders, customers, products, amounts, or due dates that are not listed here.",
    "If a count is zero, say there are no matching items in the loaded snapshot and recommend verification/monitoring actions instead of naming fake records.",
    `Active customers: ${summary.activeCustomers}.`,
    `Open invoices: ${summary.openInvoiceCount}; overdue invoices: ${summary.overdueInvoiceCount}; amount due: ${money(summary.amountDue)}.`,
    `Collected payments in loaded window: ${money(summary.collected)}.`,
    `Confirmed orders ready to invoice: ${summary.ordersToInvoiceCount}; draft orders: ${summary.draftOrderCount}.`,
    `Low-stock products: ${summary.lowStockCount}.`,
    "Top overdue/open invoices:",
    ...(overdueLines.length ? overdueLines : ["- None in the loaded snapshot."]),
    "Confirmed orders ready to invoice:",
    ...(orderLines.length ? orderLines : ["- None in the loaded snapshot."]),
    "Low-stock products:",
    ...(lowStockLines.length ? lowStockLines : ["- None in the loaded snapshot."]),
  ].join("\n")
}

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

export default function LoraAiPage() {
  const { user } = useAuth()
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

  const organizationId = useMemo(() => String(user?.org_id ?? user?.organization_slug ?? "demo-org"), [user])
  const userId = useMemo(() => String(user?.user_id ?? user?.email ?? "demo-user"), [user])

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

    loadProviders()
    return () => {
      cancelled = true
    }
  }, [])


  async function generateDailyBriefing() {
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

  const providerStatusContent = (() => {
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
  })()

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
                Ask Lora to help with operational work.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9aa4b2] md:text-base">
                Lora stays in this dedicated assistant page. Ask questions, generate operating briefings, and review the deterministic facts behind each answer.
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
                {providerStatusContent}
              </div>
            </aside>
          </div>
        </section>

        {(notice || error) && (
          <div className={`rounded-2xl border p-4 text-sm ${error ? "border-rose-300/25 bg-rose-400/10 text-rose-200" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"}`}>
            {error ?? notice}
          </div>
        )}

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
      </div>
    </div>
  )
}
