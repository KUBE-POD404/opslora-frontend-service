import Link from "next/link"
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Cloud,
  Database,
  FileText,
  GitBranch,
  KeyRound,
  Layers3,
  Lock,
  Network,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const stack = [
  {
    title: "Frontend",
    detail: "Next.js app router, TypeScript, shadcn UI, Recharts, authenticated SaaS shell.",
    icon: Layers3,
  },
  {
    title: "Services",
    detail: "FastAPI services for auth, customers, inventory, orders, invoices, and payments.",
    icon: Boxes,
  },
  {
    title: "Data",
    detail: "MySQL-compatible service databases with migration-ready schemas and tenant scoping.",
    icon: Database,
  },
  {
    title: "Delivery",
    detail: "GitHub Actions and GHCR-first image flow, ready for AKS workload deployment.",
    icon: GitBranch,
  },
]

const workflow = [
  { label: "Customers", icon: Users },
  { label: "Inventory", icon: Boxes },
  { label: "Orders", icon: ShoppingCart },
  { label: "Invoices", icon: FileText },
  { label: "Payments", icon: Receipt },
]

const cloudReadiness = [
  "AKS-first deployment model",
  "Hub-spoke Azure network plan",
  "Key Vault secret migration path",
  "Terraform workspace strategy",
  "RBAC and policy planning",
  "DR and high-availability roadmap",
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#12141a]">
      <header className="border-b border-[#dfe3ea] bg-white/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex size-8 items-center justify-center rounded-md bg-[#12141a] text-white">
              <Sparkles className="size-4" />
            </div>
            Opslora
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#596170] md:flex">
            <a href="#stack">Stack</a>
            <a href="#workflow">Workflow</a>
            <a href="#cloud">Cloud plan</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="h-9 rounded-md">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild className="h-9 rounded-md">
              <Link href="/auth/signup">Start workspace</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1fr_520px] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe3ea] bg-white px-3 py-1 text-sm text-[#596170]">
            <ShieldCheck className="size-4 text-emerald-700" />
            Business operations platform, built for Azure deployment
          </div>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
              Run customers, inventory, orders, invoices, and payments from one clear workspace.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#596170]">
              Opslora is a service-oriented business OS with a practical UI,
              real invoice/payment workflows, inventory-backed ordering, and a
              cloud plan ready for AKS, Key Vault, private networking, and DR.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-md">
              <Link href="/auth/signup">
                Create workspace
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-md bg-white">
              <Link href="/auth/login">Open existing workspace</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-[#596170]">Operational overview</div>
              <div className="text-xl font-semibold">Today&apos;s workspace</div>
            </div>
            <div className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              Cloud-ready
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Signal label="Amount due" value="Rs 0.00" tone="warn" />
            <Signal label="Orders to invoice" value="0" />
            <Signal label="Low stock" value="0" />
            <Signal label="Payments settled" value="0" tone="ok" />
          </div>
          <div className="mt-5 rounded-md border border-[#dfe3ea]">
            {workflow.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-3 border-b border-[#eef1f5] px-3 py-3 last:border-b-0">
                  <div className="flex size-8 items-center justify-center rounded-md bg-[#f2f4f8]">
                    <Icon className="size-4 text-[#596170]" />
                  </div>
                  <div className="flex-1 font-medium">{item.label}</div>
                  <div className="text-sm text-[#596170]">Step {index + 1}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="stack" className="border-y border-[#dfe3ea] bg-white py-16">
        <div className="mx-auto max-w-7xl px-5">
          <SectionHeader
            eyebrow="Tech stack"
            title="Built as a real product system, not a single monolith."
            body="The architecture separates UI, domain services, data, and delivery so each part can be tested, deployed, and secured independently."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stack.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-lg border border-[#dfe3ea] p-5">
                  <Icon className="size-5 text-[#2563eb]" />
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#596170]">{item.detail}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="py-16">
        <div className="mx-auto max-w-7xl px-5">
          <SectionHeader
            eyebrow="Workflow"
            title="The UI follows the business path."
            body="Customers feed orders, orders reserve inventory, confirmed orders become invoices, invoices collect payments, and payments close the loop."
          />
          <div className="mt-8 grid gap-3 lg:grid-cols-5">
            {workflow.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="rounded-lg border border-[#dfe3ea] bg-white p-5">
                  <Icon className="size-5 text-[#12141a]" />
                  <div className="mt-4 font-semibold">{item.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="cloud" className="bg-[#12141a] py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[420px_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-sm text-white/75">
              <Cloud className="size-4" />
              Azure target architecture
            </div>
            <h2 className="mt-5 text-3xl font-semibold">Ready for the landing zone work.</h2>
            <p className="mt-3 leading-7 text-white/70">
              The app is being shaped so the Azure platform plan has clear
              workload boundaries: networking, identity, secrets, databases,
              cluster deployment, DNS, policy, and recovery.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {cloudReadiness.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-4">
                <CheckCircle2 className="size-5 text-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-4">
              <Network className="size-5 text-blue-300" />
              <span>Hub/spoke connectivity model</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-4">
              <KeyRound className="size-5 text-amber-300" />
              <span>Secret rotation path via Key Vault</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-4">
              <Lock className="size-5 text-red-300" />
              <span>Private endpoint and policy guardrails</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function Signal({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "ok" | "warn" }) {
  const toneClass =
    tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-[#12141a]"

  return (
    <div className="rounded-md border border-[#dfe3ea] p-3">
      <div className="text-sm text-[#596170]">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-sm font-medium uppercase tracking-normal text-[#2563eb]">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-semibold tracking-normal">{title}</h2>
      <p className="mt-3 leading-7 text-[#596170]">{body}</p>
    </div>
  )
}
