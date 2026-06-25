"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, DatabaseZap, Loader2, MessageSquareText, Send, Sparkles, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

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

const promptLibrary = [
  "Summarize open invoices and list the three most important follow-ups.",
  "Find confirmed orders that are ready to invoice.",
  "Explain which low-stock products could affect active orders.",
  "Draft customer follow-up messages for overdue invoices.",
]

const capabilityCards = [
  {
    title: "Ask operations questions",
    body: "Use plain English to ask about receivables, order follow-ups, stock risk, or next actions.",
  },
  {
    title: "Add tenant knowledge",
    body: "Paste operating notes, customer context, policy snippets, or daily priorities for Lora to cite.",
  },
  {
    title: "Keep citations visible",
    body: "Lora returns snippets from retrieved tenant knowledge so users can see what informed the answer.",
  },
]

async function aiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1/ai${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
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

export default function LoraAiPage() {
  const { user } = useAuth()
  const [providers, setProviders] = useState<ProvidersResponse | null>(null)
  const [providersError, setProvidersError] = useState<string | null>(null)
  const [providersLoading, setProvidersLoading] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [message, setMessage] = useState(promptLibrary[0])
  const [knowledgeTitle, setKnowledgeTitle] = useState("Opslora operating note")
  const [knowledgeContent, setKnowledgeContent] = useState(
    "Example: This week prioritize overdue invoices, confirmed orders without invoices, and low-stock products that can block fulfilment."
  )
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)
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
      } catch (exc) {
        if (!cancelled) setProvidersError(exc instanceof Error ? exc.message : "Unable to load providers")
      } finally {
        if (!cancelled) setProvidersLoading(false)
      }
    }

    loadProviders()
    return () => {
      cancelled = true
    }
  }, [])

  async function ingestKnowledge() {
    setKnowledgeLoading(true)
    setError(null)
    setNotice(null)

    try {
      const result = await aiFetch<KnowledgeResponse>("/knowledge/sources", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          user_id: userId,
          source_type: "text",
          title: knowledgeTitle,
          source_uri: "opslora://frontend/lora-ai/manual-note",
          content: knowledgeContent,
          visibility_scope: "organization",
        }),
      })
      setNotice(`Knowledge saved: ${result.chunks_created} chunk${result.chunks_created === 1 ? "" : "s"} ready for retrieval.`)
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Unable to save knowledge")
    } finally {
      setKnowledgeLoading(false)
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
          meta: `${result.provider}${result.model ? ` · ${result.model}` : ""}${result.fallback_used ? " · fallback" : ""}`,
        },
      ])
    } catch (exc) {
      setChatTurns((turns) => turns.filter((_, index) => index !== turns.length - 1))
      setError(exc instanceof Error ? exc.message : "Unable to ask Lora")
    } finally {
      setChatLoading(false)
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
                Ask Lora to help with operational work.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9aa4b2] md:text-base">
                Lora stays in this dedicated assistant page. Add operating knowledge, ask questions, and review citations without adding assistant panels to every workflow page.
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
                {providersLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[#cbd5e1]">
                    <Loader2 className="size-4 animate-spin" /> Checking providers...
                  </div>
                ) : providersError ? (
                  <div className="rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-200">{providersError}</div>
                ) : (
                  providers?.providers.map((provider) => (
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
                )}
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
                <p className="text-sm text-[#8790a0]">Chat against the current organization context and any knowledge you add below.</p>
              </div>
            </div>

            <div className="mt-5 min-h-80 space-y-3 rounded-2xl border border-white/10 bg-[#050814] p-4">
              {chatTurns.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center text-sm text-[#8790a0]">
                  <Bot className="mb-3 size-8 text-indigo-300" />
                  Add a note or choose a prompt to start a Lora conversation.
                </div>
              ) : (
                chatTurns.map((turn, index) => (
                  <div key={`${turn.role}-${index}`} className={turn.role === "user" ? "ml-auto max-w-[85%]" : "mr-auto max-w-[90%]"}>
                    <div className={turn.role === "user" ? "rounded-2xl bg-[#3f46d8] p-4 text-sm leading-6 text-white" : "rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-[#d9e2ee]"}>
                      {turn.content}
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
            <section className="rounded-[18px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
              <div className="flex items-center gap-3">
                <DatabaseZap className="size-5 text-emerald-300" />
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.03em]">Add knowledge</h2>
                  <p className="text-sm text-[#8790a0]">Save a note for this organization and let Lora cite it in answers.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <Input
                  value={knowledgeTitle}
                  onChange={(event) => setKnowledgeTitle(event.target.value)}
                  className="border-white/10 bg-white/[0.04] text-[#f7f8fb]"
                  placeholder="Knowledge title"
                />
                <textarea
                  value={knowledgeContent}
                  onChange={(event) => setKnowledgeContent(event.target.value)}
                  className="min-h-44 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-[#f7f8fb] outline-none placeholder:text-[#8790a0] focus:border-emerald-300/40"
                  placeholder="Paste operating context, customer notes, collection priorities, stock rules, or policy snippets."
                />
                <Button
                  className="w-full rounded-2xl bg-emerald-500/90 text-[#04120b] hover:bg-emerald-400"
                  disabled={knowledgeLoading}
                  onClick={ingestKnowledge}
                >
                  {knowledgeLoading ? <Loader2 className="size-4 animate-spin" /> : <DatabaseZap className="size-4" />}
                  Save knowledge
                </Button>
              </div>
            </section>

            <section className="rounded-[18px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
              <div className="flex items-center gap-3">
                <Wand2 className="size-5 text-emerald-300" />
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.03em]">Enabled capabilities</h2>
                  <p className="text-sm text-[#8790a0]">First Lora slice, live in the app.</p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {capabilityCards.map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-[#d9e2ee]">
                    <div className="font-medium text-[#f7f8fb]">{item.title}</div>
                    <div className="mt-1 leading-6 text-[#8790a0]">{item.body}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
