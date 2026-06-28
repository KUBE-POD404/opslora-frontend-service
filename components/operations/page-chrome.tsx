import type { ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

type OperationsPageProps = {
  eyebrow: string
  title: string
  description: string
  primaryAction?: ReactNode
  children: ReactNode
  showHero?: boolean
}

export function OperationsPage({
  eyebrow,
  title,
  description,
  primaryAction,
  children,
  showHero = true,
}: OperationsPageProps) {
  return (
    <div className="-m-4 min-h-[calc(100svh-var(--header-height))] bg-[#070b16] p-4 text-[#f7f8fb] [font-feature-settings:'cv01','ss03'] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {showHero ? (
          <section className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur">
            <div className="p-5 md:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8790a0]">
                    <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
                    {eyebrow}
                  </div>
                  <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.06em] text-balance text-[#f7f8fb] md:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9aa4b2] md:text-base">
                    {description}
                  </p>
                </div>
                {primaryAction ? <div className="shrink-0">{primaryAction}</div> : null}
              </div>
            </div>
          </section>
        ) : primaryAction ? (
          <div className="flex justify-end">{primaryAction}</div>
        ) : null}
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
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "danger"
          ? "text-rose-300"
          : "text-[#f7f8fb]"

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8790a0]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tracking-[-0.05em] ${toneClass}`}>{value}</div>
      {helper ? <div className="mt-1 text-sm text-[#8790a0]">{helper}</div> : null}
    </div>
  )
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.035] shadow-[0_16px_50px_rgba(0,0,0,0.16)] ${className}`}>
      {children}
    </section>
  )
}

export function PanelToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] p-3 lg:flex-row lg:items-center lg:justify-between">{children}</div>
}

export function EmptyPanel({ title, body, actionHref, actionLabel }: { title: string; body: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <div className="font-medium text-[#f7f8fb]">{title}</div>
      <div className="mt-1 max-w-sm text-sm leading-6 text-[#8790a0]">{body}</div>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-4 rounded-[9px] bg-[#3f46d8] text-white hover:bg-[#4f57ef]">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
