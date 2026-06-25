import Link from "next/link"
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
    Command,
  CreditCard,
  FileText,
      Receipt,
  Search,
    ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const modules = [
  { label: "Customers", detail: "Profiles, business context, lifecycle status", metric: "2.4k", icon: Users, tone: "text-blue-600" },
  { label: "Inventory", detail: "SKUs, stock balances, low-stock thresholds", metric: "847", icon: Boxes, tone: "text-violet-600" },
  { label: "Orders", detail: "Drafts, confirmations, fulfillment path", metric: "126", icon: ShoppingCart, tone: "text-amber-600" },
  { label: "Invoices", detail: "Due dates, payment state, customer documents", metric: "38", icon: FileText, tone: "text-rose-600" },
  { label: "Payments", detail: "Receipts, reconciliation, collection signals", metric: "Rs 4.8L", icon: CreditCard, tone: "text-emerald-600" },
]

const tableRows = [
  ["Acme Retail", "Confirmed", "Rs 84,200", "Invoice ready", "Today"],
  ["Northwind Foods", "Draft", "Rs 18,450", "Needs stock", "Today"],
  ["Bluebird Supply", "Paid", "Rs 42,000", "Closed", "Yesterday"],
  ["Kumar Textiles", "Confirmed", "Rs 65,900", "Awaiting invoice", "Yesterday"],
  ["Vertex Labs", "Partial", "Rs 22,100", "Follow up", "Mon"],
]

const capabilities = [
  "Order-to-cash workflow in one product surface",
  "Lora AI assistant for operational summaries and next actions",
  "Ask Lora to summarize receivables, draft follow-ups, identify stock risk, and prepare invoices",
  "Modern dashboard shell with tables, command search, and status signals",
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#18181b] [font-feature-settings:'cv01','ss03']">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f7f7f4]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
            <span className="flex size-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#18181b] to-[#3f46d8] text-white shadow-[0_10px_24px_rgba(63,70,216,0.22)]">
              <Sparkles className="size-4" />
            </span>
            Opslora
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b6f76] md:flex">
            <a className="hover:text-[#18181b]" href="#platform">Platform</a>
            <a className="hover:text-[#18181b]" href="#workflow">Workflow</a>
            <a className="hover:text-[#18181b]" href="#ai">AI</a>
            <a className="hover:text-[#18181b]" href="#automation">Automation</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="h-9 rounded-[9px] border-black/15 bg-white text-[13px] font-semibold">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild className="h-9 rounded-[9px] bg-[#18181b] text-[13px] font-semibold text-white hover:bg-black">
              <Link href="/auth/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-11 px-5 py-16 lg:grid-cols-[minmax(0,0.86fr)_minmax(440px,1fr)] lg:items-center lg:py-20">
        <div>
          <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 text-xs font-semibold uppercase tracking-[0.07em] text-[#6b6f76]">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
            Modern business operations OS
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[0.96] tracking-[-0.075em] text-balance md:text-7xl lg:text-[86px]">
            Run the entire order-to-cash workflow from one calm workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6b6f76]">
            Opslora brings customers, inventory, orders, invoices, payments, and AI-assisted operations into a single product surface — built for teams that want cleaner operations and natural-language automation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-[9px] bg-[#18181b] text-white hover:bg-black">
              <Link href="/auth/signup">
                Create workspace
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-[9px] border-black/15 bg-white">
              <Link href="/auth/login">Open existing workspace</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6b6f76]">
            <span><strong className="text-[#18181b]">Natural-language</strong> order updates</span>
            <span><strong className="text-[#18181b]">Lora AI</strong> workflow assistance</span>
            <span><strong className="text-[#18181b]">Automated</strong> follow-ups</span>
          </div>
        </div>

        <ProductPreview />
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeader
          eyebrow="Platform modules"
          title="A business workspace with real operational density."
          body="Designed around the objects teams actually touch every day — with tables, status, and workflow context instead of decorative dashboards."
        />
        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {modules.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.label} className="min-h-[178px] rounded-2xl border border-black/10 bg-white/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <div className={`text-3xl font-semibold tracking-[-0.06em] ${item.tone}`}>{item.metric}</div>
                <div className="mt-8 flex items-center gap-2">
                  <Icon className="size-4 text-[#6b6f76]" />
                  <h3 className="font-semibold tracking-[-0.02em]">{item.label}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#6b6f76]">{item.detail}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="ai" className="border-y border-white/10 bg-[#111113] py-16 text-[#f7f7f4]">
        <div className="mx-auto max-w-7xl px-5">
          <SectionHeader
            eyebrow="Enhanced operating layer"
            title="Modern operations, practical automation, and Lora AI together."
            body="Opslora should feel like a polished operating workspace where users can ask Lora to summarize, draft, create, and follow up without hunting across pages."
            dark
          />
          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {capabilities.map((item) => (
              <div key={item} className="min-h-36 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <CheckCircle2 className="size-5 text-emerald-300" />
                <p className="mt-6 text-sm leading-7 text-white/65">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeader
          eyebrow="Workflow"
          title="From customer request to collected payment."
          body="The dashboard and product pages follow the natural operating sequence, so users always know the next action."
        />
        <div className="mt-8 grid overflow-hidden rounded-3xl border border-black/10 bg-white md:grid-cols-5">
          {["Capture customer", "Reserve inventory", "Confirm order", "Generate invoice", "Collect payment"].map((step, index) => (
            <div key={step} className="min-h-32 border-b border-black/10 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b6f76]">Step {index + 1}</span>
              <strong className="mt-9 block tracking-[-0.02em]">{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="automation" className="bg-[#111113] py-16 text-[#f7f7f4]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.8fr_1fr] lg:items-center">
          <SectionHeader
            eyebrow="Lora AI automation"
            title="Ask for work in plain English."
            body="Lora turns daily operations into natural-language workflows: summarize receivables, generate invoice drafts, flag low-stock risks, write customer follow-ups, and explain what needs attention next."
            dark
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [Command, "Ask: what needs attention today?"],
              [Receipt, "Draft invoices from confirmed orders"],
              [Boxes, "Flag low-stock risks before selling"],
              [Users, "Write customer follow-ups automatically"],
            ].map(([Icon, label]) => {
              const TypedIcon = Icon as typeof Command
              return (
                <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <TypedIcon className="size-5 text-white/70" />
                  <span>{label as string}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-black/15 bg-white shadow-[0_1px_1px_rgba(24,24,27,0.04),0_16px_48px_rgba(24,24,27,0.08)]">
      <div className="flex h-11 items-center gap-2 border-b border-black/10 bg-[#fbfbf9] px-4">
        <span className="size-2.5 rounded-full bg-[#d7d7d2]" />
        <span className="size-2.5 rounded-full bg-[#d7d7d2]" />
        <span className="size-2.5 rounded-full bg-[#d7d7d2]" />
        <span className="ml-2 text-xs font-medium text-[#6b6f76]">Opslora / Operations</span>
      </div>
      <div className="grid min-h-[510px] lg:grid-cols-[168px_1fr]">
        <aside className="hidden border-r border-black/10 bg-[#fbfbf9] p-3 lg:block">
          <div className="mx-2 my-3 text-[11px] font-bold uppercase tracking-[0.09em] text-[#6b6f76]">Workspace</div>
          {modules.map((item, index) => (
            <div key={item.label} className={`my-1 flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium ${index === 2 ? "bg-[#ececea] text-[#18181b]" : "text-[#565b63]"}`}>
              <span className="size-3.5 rounded bg-[#d7d8e8]" />
              {item.label}
            </div>
          ))}
          <div className="mx-2 mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.09em] text-[#6b6f76]">System</div>
          <div className="my-1 flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-[#565b63]"><Command className="size-3.5" /> Lora AI</div>
        </aside>
        <div className="min-w-0 p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b6f76]">Today&apos;s operating view</div>
              <div className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Orders requiring action</div>
            </div>
            <div className="hidden h-9 min-w-48 items-center gap-2 rounded-[9px] border border-black/10 bg-[#fafafa] px-3 text-xs text-[#6b6f76] sm:flex">
              <Search className="size-3.5" /> ⌘K Search workspace
            </div>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            <PreviewMetric label="Due" value="Rs 2.3L" />
            <PreviewMetric label="To invoice" value="18" />
            <PreviewMetric label="Low stock" value="7" />
            <PreviewMetric label="Settled" value="94%" />
          </div>
          <div className="overflow-hidden rounded-[13px] border border-black/10">
            <div className="grid min-h-11 grid-cols-[1.2fr_.8fr_.8fr] items-center gap-2 bg-[#fbfbf9] px-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b6f76] lg:grid-cols-[1.2fr_.8fr_.8fr_1fr_.55fr]">
              <span>Customer</span><span>Status</span><span>Amount</span><span className="hidden lg:block">Next step</span><span className="hidden lg:block">Added</span>
            </div>
            {tableRows.map(([customer, status, amount, next, added]) => (
              <div key={`${customer}-${status}`} className="grid min-h-11 grid-cols-[1.2fr_.8fr_.8fr] items-center gap-2 border-t border-black/10 px-3 text-xs lg:grid-cols-[1.2fr_.8fr_.8fr_1fr_.55fr]">
                <strong>{customer}</strong>
                <span className={`w-fit rounded-full border px-2 py-1 text-[11px] font-semibold ${status === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "Draft" ? "border-amber-200 bg-amber-50 text-amber-700" : status === "Partial" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-black/10 bg-[#f7f7f4] text-[#18181b]"}`}>{status}</span>
                <span>{amount}</span>
                <span className="hidden lg:block">{next}</span>
                <span className="hidden lg:block">{added}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[13px] border border-[#3f46d8]/15 bg-gradient-to-br from-[#3f46d8]/10 to-white/70 p-3">
            <strong className="text-sm">Lora noticed 3 confirmed orders can be invoiced today.</strong>
            <p className="mt-1 text-xs leading-5 text-[#6b6f76]">Generate drafts, check low-stock conflicts, and prepare customer follow-up in one pass.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-gradient-to-b from-white to-[#fbfbfa] p-3">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b6f76]">{label}</span>
      <strong className="mt-1.5 block text-lg tracking-[-0.04em]">{value}</strong>
    </div>
  )
}

function SectionHeader({ eyebrow, title, body, dark = false }: { eyebrow: string; title: string; body: string; dark?: boolean }) {
  return (
    <div className="max-w-3xl">
      <div className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.07em] ${dark ? "border-white/10 bg-white/[0.04] text-white/60" : "border-black/10 bg-white/70 text-[#6b6f76]"}`}>{eyebrow}</div>
      <h2 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.06em] text-balance md:text-5xl">{title}</h2>
      <p className={`mt-4 text-base leading-8 ${dark ? "text-white/60" : "text-[#6b6f76]"}`}>{body}</p>
    </div>
  )
}
