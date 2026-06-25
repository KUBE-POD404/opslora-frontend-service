import { Bot, MessageSquareText, Sparkles, Wand2 } from "lucide-react"

const prompts = [
  "Summarize open invoices and list the three most important follow-ups.",
  "Find confirmed orders that are ready to invoice.",
  "Explain which low-stock products could affect active orders.",
  "Draft customer follow-up messages for overdue invoices.",
]

const capabilities = [
  "Receivables summaries",
  "Invoice draft assistance",
  "Order follow-up suggestions",
  "Inventory risk explanations",
  "Customer communication drafts",
  "Daily operating briefings",
]

export default function LoraAiPage() {
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
                Lora stays in this dedicated assistant page so the core customers, inventory, orders, invoices, and payments screens remain focused on the workflow.
              </p>
            </div>
            <aside className="border-t border-white/10 bg-[#0d1220] p-5 lg:border-l lg:border-t-0 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8790a0]">Suggested request</div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">What needs attention today?</h2>
                </div>
                <Sparkles className="size-5 text-indigo-300" />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-[#cbd5e1]">
                Summarize receivables, orders waiting for invoices, and stock risks. Then draft the first three actions.
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[18px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <MessageSquareText className="size-5 text-indigo-300" />
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.03em]">Prompt library</h2>
                <p className="text-sm text-[#8790a0]">Use these as starting points for daily operations.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {prompts.map((prompt) => (
                <div key={prompt} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-[#d9e2ee]">
                  <span className="mr-2 text-[#8790a0]">Ask</span>{prompt}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[18px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <Wand2 className="size-5 text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.03em]">Assistant scope</h2>
                <p className="text-sm text-[#8790a0]">Lora is for operational help, not page decoration.</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {capabilities.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[#d9e2ee]">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
