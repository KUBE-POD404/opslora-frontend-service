"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, Loader2, MessageSquarePlus, PanelLeft, Send, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { apiFetch, getStoredTokens } from "@/lib/api"
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

type ChatSession = {
  id: string
  title: string
  conversationId: string | null
  turns: ChatTurn[]
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



async function aiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  headers.set("Content-Type", "application/json")
  const token = getStoredTokens().accessToken
  if (token) headers.set("Authorization", `Bearer ${token}`)

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

export default function LoraAiPage() { // NOSONAR - page orchestrates consent, provider status, and chat state; complex UI is split into child components
  const { user } = useAuth()
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [consentSaving, setConsentSaving] = useState(false)
  const [providers, setProviders] = useState<ProvidersResponse | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState("ollama")
  const [chatLoading, setChatLoading] = useState(false)
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
        const data = await aiFetch<ProvidersResponse>("/providers")
        if (!cancelled) {
          setProviders(data)
          setSelectedProvider(data.primary || data.providers[0]?.name || "ollama")
        }
      } catch {
        if (!cancelled) setSelectedProvider("ollama")
      }
    }

    if (settingsLoading || !loraConsentEnabled) {
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
    }
  }

  function upsertSession(nextConversationId: string | null, turns: ChatTurn[]) {
    const sessionId = activeSessionId ?? nextConversationId ?? `local-${Date.now()}`
    const title = turns.find((turn) => turn.role === "user")?.content.slice(0, 56) || "New chat"
    setActiveSessionId(sessionId)
    setChatSessions((sessions) => {
      const next = { id: sessionId, title, conversationId: nextConversationId, turns }
      const others = sessions.filter((session) => session.id !== sessionId)
      return [next, ...others].slice(0, 12)
    })
  }

  function startNewChat() {
    setActiveSessionId(null)
    setConversationId(null)
    setChatTurns([])
    setMessage("")
    setNotice(null)
    setError(null)
  }

  function openSession(session: ChatSession) {
    setActiveSessionId(session.id)
    setConversationId(session.conversationId)
    setChatTurns(session.turns)
    setMessage("")
    setNotice(null)
    setError(null)
  }

  async function askLora(nextMessage = message) {
    if (!loraConsentEnabled) {
      setError("Lora AI is disabled until an admin consents to share organization data with Lora AI.")
      return
    }

    const cleanMessage = nextMessage.trim()
    if (!cleanMessage) return
    if (cleanMessage === "/briefing") {
      setMessage("")
      await generateDailyBriefing()
      return
    }

    setChatLoading(true)
    setError(null)
    setNotice(null)
    setMessage("")
    const userTurn: ChatTurn = { role: "user", content: cleanMessage }
    const optimisticTurns = [...chatTurns, userTurn]
    setChatTurns(optimisticTurns)

    try {
      const result = await aiFetch<ChatResponse>("/chat", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          user_id: userId,
          message: cleanMessage,
          conversation_id: conversationId,
          use_fallback: true,
          preferred_provider: selectedProvider,
        }),
      })
      const nextConversationId = result.conversation_id ?? null
      setConversationId(nextConversationId)
      const finalTurns: ChatTurn[] = [
        ...optimisticTurns,
        {
          role: "assistant",
          content: result.response,
          citations: result.citations,
          meta: [result.provider, result.model, result.fallback_used ? "fallback" : null].filter(Boolean).join(" · "),
        },
      ]
      setChatTurns(finalTurns)
      upsertSession(nextConversationId, finalTurns)
    } catch (error_) {
      setChatTurns(chatTurns)
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
    <div className="-m-4 flex h-[calc(100svh-var(--header-height))] overflow-hidden bg-background text-foreground">
      {historyOpen ? (
        <aside className="hidden w-72 shrink-0 border-r bg-muted/35 p-3 md:flex md:flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Lora</div>
            <Button variant="ghost" size="icon-sm" onClick={startNewChat} title="New chat">
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
          <div className="space-y-1 overflow-y-auto scrollbar-quiet">
            {chatSessions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No conversations yet.</div>
            ) : chatSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => openSession(session)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${activeSessionId === session.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"}`}
              >
                <span className="line-clamp-2">{session.title}</span>
              </button>
            ))}
          </div>
        </aside>
      ) : null}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3">
          <Button variant="ghost" size="icon-sm" onClick={() => setHistoryOpen((open) => !open)} title="Toggle conversation history">
            <PanelLeft className="size-4" />
          </Button>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {(providers?.providers.length ? providers.providers : [{ name: selectedProvider, configured: true, available: true }]).map((provider) => (
                <SelectItem key={provider.name} value={provider.name}>{provider.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className={loraConsentEnabled ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-amber-500"} />
            {loraConsentEnabled ? "Enabled" : "Locked"}
          </div>
        </header>

        {(notice || error) && (
          <div className={`mx-4 mt-3 rounded-lg border p-3 text-sm ${error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"}`}>
            {error ?? notice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 scrollbar-quiet">
          {settingsLoading ? (
            <div className="inline-flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading Lora...</div>
          ) : null}

          {!settingsLoading && !loraConsentEnabled ? (
            <div className="mx-auto mt-10 max-w-xl rounded-xl border bg-card p-5 text-sm leading-6 text-card-foreground shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><ShieldCheck className="size-4" /> Admin consent needed</div>
              <h2 className="mt-3 text-xl font-semibold">Lora is locked for this organization.</h2>
              <p className="mt-2 text-muted-foreground">Enable consent before organization data is shared with Lora AI.</p>
              {canManageLoraConsent ? (
                <Button className="mt-4" disabled={consentSaving || !organizationSettings} onClick={enableLoraConsent}>
                  {consentSaving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  Enable Lora AI
                </Button>
              ) : null}
            </div>
          ) : null}

          {loraConsentEnabled && chatTurns.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Bot className="mr-2 size-5" /> Lora is ready.
            </div>
          ) : null}

          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {loraConsentEnabled ? chatTurns.map((turn, index) => (
              <div key={`${turn.role}-${index}`} className={turn.role === "user" ? "ml-auto max-w-[82%]" : "mr-auto max-w-[88%]"}>
                <div className={turn.role === "user" ? "rounded-2xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground" : "rounded-2xl border bg-card px-4 py-3 text-sm leading-6 text-card-foreground shadow-sm"}>
                  {turn.role === "assistant" ? <MarkdownMessage content={turn.content} /> : turn.content}
                </div>
                {turn.meta ? <div className="mt-1 px-2 text-xs text-muted-foreground">{turn.meta}</div> : null}
                {turn.citations && turn.citations.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {turn.citations.map((citation) => (
                      <div key={citation.chunk_id} className="rounded-xl border bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                        <div className="mb-1 font-semibold text-foreground">Citation {citation.chunk_index + 1}</div>
                        {citation.snippet}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )) : null}
            {chatLoading ? (
              <div className="mr-auto inline-flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Lora is thinking...</div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t bg-background p-3">
          <div className="mx-auto flex max-w-4xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm md:flex-row md:items-end">
            <label className="flex flex-1 items-start gap-2 px-2 py-1 text-sm text-muted-foreground">
              <span className="pt-2 font-medium text-foreground">lora</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    askLora()
                  }
                }}
                className="min-h-12 flex-1 resize-none bg-transparent py-2 text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Message Lora or type /briefing"
                disabled={!loraConsentEnabled || chatLoading}
              />
            </label>
            <Button disabled={!loraConsentEnabled || chatLoading || !message.trim()} onClick={() => askLora()}>
              {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
