import type { ReactNode } from "react"
import Link from "next/link"
import { Bot, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

type OperationsPageProps = {
  eyebrow: string
  title: string
  description: string
  primaryAction?: ReactNode
  children: ReactNode
  loraPrompts?: string[]
}

export function OperationsPage({
  eyebrow,
  title,
  description,
  primaryAction,
  children,
  loraPrompts = [],
}: OperationsPageProps) {
  return (
    <div className="-m-4 min-h-[calc(100svh-var(--header-height))] bg-[#f7f7f4] p-4 text-[#18181b] [font-feature-settings:'cv01','ss03'] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_1px_1px_rgba(24,24,27,0.04),0_18px_60px_rgba(24,24,27,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="p-5 md:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f7f4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b6f76]">
                    <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                    {eyebrow}
                  </div>
                  <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.06em] text-balance md:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b6f76] md:text-base">
                    {description}
                  </p>
                </div>
                {primaryAction ? <div className="shrink-0">{primaryAction}</div> : null}
              </div>
            </div>
            <aside className="border-t border-black/10 bg-[#111113] p-5 text-white lg:border-l lg:border-t-0 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">
                    <Bot className="size-4" /> Lora AI
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">Ask for the next action</h2>
                </div>
                <Sparkles className="size-5 text-indigo-300" />
              </div>
              <div className="mt-5 space-y-3">
                {(loraPrompts.length ? loraPrompts : ["Summarize what needs attention", "Draft the next customer follow-up", "Find exceptions before I continue"]).map((prompt) => (
                  <div key={prompt} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-white/72">
                    <span className="mr-2 text-white/35">Ask</span>{prompt}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
        {children}
      </div>
    </div>
  )
}

export function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string
  value: ReactNode
  helper?: ReactNode
  tone?: "neutral" | "ok" | "warn" | "danger"
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-rose-600"
          : "text-[#18181b]"

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b6f76]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tracking-[-0.05em] ${toneClass}`}>{value}</div>
      {helper ? <div className="mt-1 text-sm text-[#6b6f76]">{helper}</div> : null}
    </div>
  )
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_1px_1px_rgba(24,24,27,0.04)] ${className}`}>
      {children}
    </section>
  )
}

export function PanelToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-black/10 bg-[#fbfbf9] p-3 lg:flex-row lg:items-center lg:justify-between">{children}</div>
}

export function EmptyPanel({ title, body, actionHref, actionLabel }: { title: string; body: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <div className="font-medium text-[#18181b]">{title}</div>
      <div className="mt-1 max-w-sm text-sm leading-6 text-[#6b6f76]">{body}</div>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-4 rounded-[9px] bg-[#18181b] text-white hover:bg-black">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
