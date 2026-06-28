import type { ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

const surfaceCard = "border-border/70 bg-card text-card-foreground shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.22)]"

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
}: Readonly<OperationsPageProps>) {
  return (
    <div className="-m-4 min-h-[calc(100svh-var(--header-height))] bg-background p-4 text-foreground [font-feature-settings:'cv01','ss03'] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {showHero ? (
          <section className={`overflow-hidden rounded-[22px] border backdrop-blur ${surfaceCard}`}>
            <div className="p-5 md:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
                    {eyebrow}
                  </div>
                  <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.06em] text-balance text-foreground md:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
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
}: Readonly<{
  label: string
  value: ReactNode
  helper?: ReactNode
  tone?: "neutral" | "ok" | "warn" | "danger"
}>) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-300"
        : tone === "danger"
          ? "text-rose-600 dark:text-rose-300"
          : "text-foreground"

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 text-card-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tracking-[-0.05em] ${toneClass}`}>{value}</div>
      {helper ? <div className="mt-1 text-sm text-muted-foreground">{helper}</div> : null}
    </div>
  )
}

export function Panel({ children, className = "" }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <section className={`overflow-hidden rounded-[18px] border border-border/70 bg-card text-card-foreground shadow-[0_16px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.16)] ${className}`}>
      {children}
    </section>
  )
}

export function PanelToolbar({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-3 lg:flex-row lg:items-center lg:justify-between">{children}</div>
}

export function EmptyPanel({ title, body, actionHref, actionLabel }: Readonly<{ title: string; body: string; actionHref?: string; actionLabel?: string }>) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{body}</div>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-4 rounded-[9px]">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
