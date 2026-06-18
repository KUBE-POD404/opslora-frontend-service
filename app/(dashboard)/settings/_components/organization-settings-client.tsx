"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { Building2, FileText, Globe2, Landmark, Save, ToggleLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type OrganizationSettings = {
  organization_id: number
  legal_name: string | null
  display_name: string | null
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  country: string | null
  state: string | null
  tax_id: string | null
  gstin: string | null
  tax_registration_type: string | null
  default_tax_mode: string | null
  invoice_prefix: string
  next_invoice_sequence: number
  default_due_days: number
  default_invoice_terms: string | null
  default_invoice_footer: string | null
  round_off_enabled: boolean
  default_invoice_template: string | null
  inventory_enabled: boolean
  gst_invoice_enabled: boolean
  customer_portal_enabled: boolean
  online_payments_enabled: boolean
  multi_warehouse_enabled: boolean
  advanced_reports_enabled: boolean
}

type OrganizationSettingsForm = Omit<OrganizationSettings, "organization_id"> & {
  legal_name: string
  display_name: string
  logo_url: string
  address: string
  phone: string
  email: string
  website: string
  country: string
  state: string
  tax_id: string
  gstin: string
  tax_registration_type: string
  default_tax_mode: string
  invoice_prefix: string
  next_invoice_sequence: number
  default_due_days: number
  default_invoice_terms: string
  default_invoice_footer: string
  default_invoice_template: string
}

type FeatureFlag = {
  flag_key: string
  is_enabled: boolean
}

type SettingsSection = "business" | "tax" | "invoice" | "features" | "portal"

const defaultSettings: OrganizationSettingsForm = {
  legal_name: "",
  display_name: "",
  logo_url: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  country: "India",
  state: "",
  tax_id: "",
  gstin: "",
  tax_registration_type: "GST",
  default_tax_mode: "exclusive",
  invoice_prefix: "INV",
  next_invoice_sequence: 1,
  default_due_days: 30,
  default_invoice_terms: "",
  default_invoice_footer: "",
  round_off_enabled: false,
  default_invoice_template: "opslora_default",
  inventory_enabled: true,
  gst_invoice_enabled: true,
  customer_portal_enabled: false,
  online_payments_enabled: false,
  multi_warehouse_enabled: false,
  advanced_reports_enabled: false,
}

const capabilityToggles: Array<{
  key: keyof Pick<
    OrganizationSettingsForm,
    | "inventory_enabled"
    | "gst_invoice_enabled"
    | "customer_portal_enabled"
    | "online_payments_enabled"
    | "multi_warehouse_enabled"
    | "advanced_reports_enabled"
  >
  title: string
}> = [
  { key: "inventory_enabled", title: "Inventory enabled" },
  { key: "gst_invoice_enabled", title: "GST invoice enabled" },
  { key: "customer_portal_enabled", title: "Customer portal enabled" },
  { key: "online_payments_enabled", title: "Online payments enabled" },
  { key: "multi_warehouse_enabled", title: "Multi warehouse enabled" },
  { key: "advanced_reports_enabled", title: "Advanced reports enabled" },
]

const sectionCopy: Record<
  SettingsSection,
  { title: string; description: string; panelTitle: string; panelDescription: string; icon: ReactNode }
> = {
  business: {
    title: "Business Profile",
    description: "Legal identity and public contact details used on invoices and portal surfaces.",
    panelTitle: "Business profile",
    panelDescription: "GET/PUT /api/v1/settings/organization",
    icon: <Building2 className="h-4 w-4" />,
  },
  tax: {
    title: "Tax Profile",
    description: "Registration, jurisdiction, and default tax treatment for invoice creation.",
    panelTitle: "Tax profile",
    panelDescription: "Keep tax identity separate from general business contact details.",
    icon: <Landmark className="h-4 w-4" />,
  },
  invoice: {
    title: "Invoice Defaults",
    description: "Numbering, due dates, terms, footer, and template defaults for new invoices.",
    panelTitle: "Invoice defaults",
    panelDescription: "Defaults are snapshotted into invoices so historical documents stay stable.",
    icon: <FileText className="h-4 w-4" />,
  },
  features: {
    title: "Feature Flags",
    description: "Tenant module toggles and future plan-gated capability.",
    panelTitle: "Feature flags",
    panelDescription: "Use switches because these are binary tenant capabilities.",
    icon: <ToggleLeft className="h-4 w-4" />,
  },
  portal: {
    title: "Portal",
    description: "Customer-facing portal basics and public presentation defaults.",
    panelTitle: "Portal",
    panelDescription: "Portal controls stay focused on customer-visible behavior.",
    icon: <Globe2 className="h-4 w-4" />,
  },
}

function settingsToForm(settings: OrganizationSettings): OrganizationSettingsForm {
  return {
    legal_name: settings.legal_name ?? "",
    display_name: settings.display_name ?? "",
    logo_url: settings.logo_url ?? "",
    address: settings.address ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    website: settings.website ?? "",
    country: settings.country ?? "India",
    state: settings.state ?? "",
    tax_id: settings.tax_id ?? "",
    gstin: settings.gstin ?? "",
    tax_registration_type: settings.tax_registration_type ?? "GST",
    default_tax_mode: settings.default_tax_mode ?? "exclusive",
    invoice_prefix: settings.invoice_prefix ?? "INV",
    next_invoice_sequence: settings.next_invoice_sequence ?? 1,
    default_due_days: settings.default_due_days ?? 30,
    default_invoice_terms: settings.default_invoice_terms ?? "",
    default_invoice_footer: settings.default_invoice_footer ?? "",
    round_off_enabled: settings.round_off_enabled,
    default_invoice_template: settings.default_invoice_template ?? "opslora_default",
    inventory_enabled: settings.inventory_enabled,
    gst_invoice_enabled: settings.gst_invoice_enabled,
    customer_portal_enabled: settings.customer_portal_enabled,
    online_payments_enabled: settings.online_payments_enabled,
    multi_warehouse_enabled: settings.multi_warehouse_enabled,
    advanced_reports_enabled: settings.advanced_reports_enabled,
  }
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function formToPayload(form: OrganizationSettingsForm) {
  return {
    legal_name: nullable(form.legal_name),
    display_name: nullable(form.display_name),
    logo_url: nullable(form.logo_url),
    address: nullable(form.address),
    phone: nullable(form.phone),
    email: nullable(form.email),
    website: nullable(form.website),
    country: nullable(form.country),
    state: nullable(form.state),
    tax_id: nullable(form.tax_id),
    gstin: nullable(form.gstin),
    tax_registration_type: nullable(form.tax_registration_type),
    default_tax_mode: nullable(form.default_tax_mode),
    invoice_prefix: form.invoice_prefix.trim() || "INV",
    next_invoice_sequence: Number(form.next_invoice_sequence) || 1,
    default_due_days: Number(form.default_due_days) || 0,
    default_invoice_terms: nullable(form.default_invoice_terms),
    default_invoice_footer: nullable(form.default_invoice_footer),
    round_off_enabled: form.round_off_enabled,
    default_invoice_template: nullable(form.default_invoice_template),
    inventory_enabled: form.inventory_enabled,
    gst_invoice_enabled: form.gst_invoice_enabled,
    customer_portal_enabled: form.customer_portal_enabled,
    online_payments_enabled: form.online_payments_enabled,
    multi_warehouse_enabled: form.multi_warehouse_enabled,
    advanced_reports_enabled: form.advanced_reports_enabled,
  }
}

export function OrganizationSettingsClient({ section }: { section: SettingsSection }) {
  const copy = sectionCopy[section]
  const [initialForm, setInitialForm] = useState<OrganizationSettingsForm>(defaultSettings)
  const [form, setForm] = useState<OrganizationSettingsForm>(defaultSettings)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const enabledCount = useMemo(
    () => capabilityToggles.filter((item) => Boolean(form[item.key])).length,
    [form]
  )

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setLoading(true)
      try {
        const [settings, flags] = await Promise.all([
          apiFetch<OrganizationSettings>("/settings/organization"),
          apiFetch<FeatureFlag[]>("/settings/feature-flags"),
        ])

        if (!cancelled) {
          const nextForm = settingsToForm(settings)
          setInitialForm(nextForm)
          setForm(nextForm)
          setFeatureFlags(flags)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load organization settings")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  function updateForm<K extends keyof OrganizationSettingsForm>(
    key: K,
    value: OrganizationSettingsForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const updated = await apiFetch<OrganizationSettings>("/settings/organization", {
        method: "PUT",
        body: JSON.stringify(formToPayload(form)),
      })
      const nextForm = settingsToForm(updated)
      setInitialForm(nextForm)
      setForm(nextForm)
      toast.success(`${copy.title} saved`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to save ${copy.title}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <form id="organization-settings-form" onSubmit={handleSave} className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[#12141a] sm:text-[26px]">
            {copy.title}
          </h1>
          <p className="mt-1 text-[13px] text-[#6b707d]">{copy.description}</p>
        </div>
        <div className="flex gap-3 sm:pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-md"
            onClick={() => setForm(initialForm)}
            disabled={saving}
          >
            Discard
          </Button>
          <Button className="h-9 rounded-md bg-[#17181d] text-white hover:bg-[#262a33]" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[#e0e4eb] bg-white px-4 py-4 text-[13px] font-medium text-[#0f6b33]">
        Current subpage is selected in the sidebar. No in-page nav is repeated here.
      </div>

      <section className="rounded-lg border border-[#e0e4eb] bg-white p-4 sm:p-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-md border border-[#e0e4eb] bg-[#f8f9fa] p-2 text-[#6b707d]">
            {copy.icon}
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#12141a]">{copy.panelTitle}</h2>
            <p className="mt-1 text-xs text-[#6b707d]">{copy.panelDescription}</p>
          </div>
        </div>

        {section === "business" ? (
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField id="legal_name" label="Legal name" value={form.legal_name} onChange={(value) => updateForm("legal_name", value)} />
              <TextField id="display_name" label="Display name" value={form.display_name} onChange={(value) => updateForm("display_name", value)} />
              <TextField id="email" label="Email" value={form.email} onChange={(value) => updateForm("email", value)} type="email" />
              <TextField id="phone" label="Phone" value={form.phone} onChange={(value) => updateForm("phone", value)} />
              <TextField id="website" label="Website" value={form.website} onChange={(value) => updateForm("website", value)} placeholder="https://example.com" />
              <TextField id="address" label="Address" value={form.address} onChange={(value) => updateForm("address", value)} />
            </div>
          </FieldGroup>
        ) : null}

        {section === "tax" ? (
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField id="country" label="Country" value={form.country} onChange={(value) => updateForm("country", value)} />
              <TextField id="state" label="State" value={form.state} onChange={(value) => updateForm("state", value)} />
              <TextField id="tax_id" label="Tax ID" value={form.tax_id} onChange={(value) => updateForm("tax_id", value)} />
              <TextField id="gstin" label="GSTIN" value={form.gstin} onChange={(value) => updateForm("gstin", value.toUpperCase())} />
              <TextField id="tax_registration_type" label="Tax registration type" value={form.tax_registration_type} onChange={(value) => updateForm("tax_registration_type", value)} />
              <TextField id="default_tax_mode" label="Default tax mode" value={form.default_tax_mode} onChange={(value) => updateForm("default_tax_mode", value)} />
            </div>
          </FieldGroup>
        ) : null}

        {section === "invoice" ? (
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-3">
              <TextField id="invoice_prefix" label="Prefix" value={form.invoice_prefix} onChange={(value) => updateForm("invoice_prefix", value.toUpperCase())} />
              <NumberField id="next_invoice_sequence" label="Next number" value={form.next_invoice_sequence} onChange={(value) => updateForm("next_invoice_sequence", value)} min={1} />
              <NumberField id="default_due_days" label="Due days" value={form.default_due_days} onChange={(value) => updateForm("default_due_days", value)} min={0} max={365} />
            </div>
            <TextField id="default_invoice_template" label="Default invoice template" value={form.default_invoice_template} onChange={(value) => updateForm("default_invoice_template", value)} />
            <TextField id="default_invoice_terms" label="Default invoice terms" value={form.default_invoice_terms} onChange={(value) => updateForm("default_invoice_terms", value)} />
            <TextField id="default_invoice_footer" label="Default invoice footer" value={form.default_invoice_footer} onChange={(value) => updateForm("default_invoice_footer", value)} />
            <ToggleSwitch id="round_off_enabled" title="Round off invoice totals" checked={form.round_off_enabled} onCheckedChange={(checked) => updateForm("round_off_enabled", checked)} />
          </FieldGroup>
        ) : null}

        {section === "features" ? (
          <div className="grid gap-x-20 gap-y-7 md:grid-cols-2">
            {capabilityToggles.map((item) => (
              <ToggleSwitch
                key={item.key}
                id={item.key}
                title={item.title}
                checked={Boolean(form[item.key])}
                onCheckedChange={(checked) => updateForm(item.key, checked)}
              />
            ))}
            <p className="md:col-span-2 text-xs text-[#6b707d]">
              {enabledCount}/{capabilityToggles.length} organization capabilities enabled. {featureFlags.length} backend feature flag records loaded.
            </p>
          </div>
        ) : null}

        {section === "portal" ? (
          <FieldGroup>
            <ToggleSwitch
              id="customer_portal_enabled"
              title="Customer portal enabled"
              checked={form.customer_portal_enabled}
              onCheckedChange={(checked) => updateForm("customer_portal_enabled", checked)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField id="logo_url" label="Logo URL" value={form.logo_url} onChange={(value) => updateForm("logo_url", value)} placeholder="https://..." />
              <TextField id="website" label="Website" value={form.website} onChange={(value) => updateForm("website", value)} placeholder="https://example.com" />
              <TextField id="email" label="Public email" value={form.email} onChange={(value) => updateForm("email", value)} type="email" />
              <TextField id="phone" label="Public phone" value={form.phone} onChange={(value) => updateForm("phone", value)} />
            </div>
          </FieldGroup>
        ) : null}
      </section>
    </form>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className="text-xs font-medium text-[#12141a]">
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-md border-[#e0e4eb] text-xs"
      />
    </Field>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className="text-xs font-medium text-[#12141a]">
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-md border-[#e0e4eb] text-xs"
      />
    </Field>
  )
}

function ToggleSwitch({
  id,
  title,
  checked,
  onCheckedChange,
}: {
  id: string
  title: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal" className="items-center gap-3">
      <button
        id={id}
        name={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={[
          "relative h-[22px] w-[38px] rounded-full transition-colors",
          checked ? "bg-[#17181d]" : "bg-[#eceef2]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-[3px] h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-[19px]" : "translate-x-[3px]",
          ].join(" ")}
        />
      </button>
      <FieldContent>
        <FieldTitle className="text-xs font-medium text-[#12141a]">{title}</FieldTitle>
      </FieldContent>
    </Field>
  )
}
