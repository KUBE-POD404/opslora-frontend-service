"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BadgeCheck,
  Building2,
  FileText,
  Globe2,
  Landmark,
  ReceiptText,
  Save,
  ToggleLeft,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
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

type OrganizationSettingsForm = {
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
  round_off_enabled: boolean
  default_invoice_template: string
  inventory_enabled: boolean
  gst_invoice_enabled: boolean
  customer_portal_enabled: boolean
  online_payments_enabled: boolean
  multi_warehouse_enabled: boolean
  advanced_reports_enabled: boolean
}

type FeatureFlag = {
  flag_key: string
  is_enabled: boolean
}

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
  default_invoice_template: "standard",
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
  description: string
}> = [
  {
    key: "inventory_enabled",
    title: "Inventory",
    description: "Enable product, stock, and warehouse-aware ordering workflows.",
  },
  {
    key: "gst_invoice_enabled",
    title: "GST invoices",
    description: "Show GSTIN and tax treatment fields on invoice documents.",
  },
  {
    key: "customer_portal_enabled",
    title: "Customer portal",
    description: "Prepare self-service customer links and hosted invoice access.",
  },
  {
    key: "online_payments_enabled",
    title: "Online payments",
    description: "Allow payment provider collection links once gateway wiring is live.",
  },
  {
    key: "multi_warehouse_enabled",
    title: "Multi-warehouse",
    description: "Reserve UI/API behavior for multiple stock locations.",
  },
  {
    key: "advanced_reports_enabled",
    title: "Advanced reports",
    description: "Expose richer reports when reporting service work is enabled.",
  },
]

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
    default_invoice_template: settings.default_invoice_template ?? "standard",
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

export default function OrganizationSettingsPage() {
  const [form, setForm] = useState<OrganizationSettingsForm>(defaultSettings)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [organizationId, setOrganizationId] = useState<number | null>(null)
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
          setOrganizationId(settings.organization_id)
          setForm(settingsToForm(settings))
          setFeatureFlags(flags)
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load organization settings"
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const updated = await apiFetch<OrganizationSettings>("/settings/organization", {
        method: "PUT",
        body: JSON.stringify(formToPayload(form)),
      })

      setOrganizationId(updated.organization_id)
      setForm(settingsToForm(updated))
      toast.success("Organization settings saved")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save organization settings"
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organization Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure business identity, GST/tax defaults, invoice numbering, and
            staged product capabilities for this tenant.
          </p>
        </div>
        <Button form="organization-settings-form" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save organization"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<Building2 className="h-4 w-4" />}
          label="Organization"
          value={form.display_name || form.legal_name || "Unnamed"}
          helper={organizationId ? `Org ID ${organizationId}` : "New tenant"}
        />
        <SummaryCard
          icon={<ReceiptText className="h-4 w-4" />}
          label="Invoice sequence"
          value={`${form.invoice_prefix || "INV"}-${form.next_invoice_sequence}`}
          helper={`${form.default_due_days} default due days`}
        />
        <SummaryCard
          icon={<ToggleLeft className="h-4 w-4" />}
          label="Capabilities"
          value={`${enabledCount}/${capabilityToggles.length} enabled`}
          helper={`${featureFlags.length} explicit feature flags`}
        />
      </div>

      <form id="organization-settings-form" onSubmit={handleSave}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Business identity
              </CardTitle>
              <CardDescription>
                These details appear on invoices, customer communication, and tenant
                branding surfaces.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField id="legal_name" label="Legal name" value={form.legal_name} onChange={(value) => updateForm("legal_name", value)} />
                  <TextField id="display_name" label="Display name" value={form.display_name} onChange={(value) => updateForm("display_name", value)} />
                </div>
                <TextField id="logo_url" label="Logo URL" value={form.logo_url} onChange={(value) => updateForm("logo_url", value)} placeholder="https://..." />
                <TextField id="address" label="Billing address" value={form.address} onChange={(value) => updateForm("address", value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField id="phone" label="Phone" value={form.phone} onChange={(value) => updateForm("phone", value)} />
                  <TextField id="email" label="Billing email" value={form.email} onChange={(value) => updateForm("email", value)} type="email" />
                </div>
                <TextField id="website" label="Website" value={form.website} onChange={(value) => updateForm("website", value)} placeholder="https://example.com" />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Tax profile
              </CardTitle>
              <CardDescription>
                Store tax identity and default tax treatment once so invoice creation
                stays consistent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField id="country" label="Country" value={form.country} onChange={(value) => updateForm("country", value)} />
                  <TextField id="state" label="State" value={form.state} onChange={(value) => updateForm("state", value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField id="tax_id" label="Tax ID" value={form.tax_id} onChange={(value) => updateForm("tax_id", value)} />
                  <TextField id="gstin" label="GSTIN" value={form.gstin} onChange={(value) => updateForm("gstin", value.toUpperCase())} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField id="tax_registration_type" label="Tax registration type" value={form.tax_registration_type} onChange={(value) => updateForm("tax_registration_type", value)} />
                  <TextField id="default_tax_mode" label="Default tax mode" value={form.default_tax_mode} onChange={(value) => updateForm("default_tax_mode", value)} />
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice defaults
              </CardTitle>
              <CardDescription>
                Numbering, payment terms, document footer, and template defaults used by
                invoice-service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField id="invoice_prefix" label="Prefix" value={form.invoice_prefix} onChange={(value) => updateForm("invoice_prefix", value.toUpperCase())} />
                  <NumberField id="next_invoice_sequence" label="Next number" value={form.next_invoice_sequence} onChange={(value) => updateForm("next_invoice_sequence", value)} min={1} />
                  <NumberField id="default_due_days" label="Due days" value={form.default_due_days} onChange={(value) => updateForm("default_due_days", value)} min={0} max={365} />
                </div>
                <TextField id="default_invoice_template" label="Default invoice template" value={form.default_invoice_template} onChange={(value) => updateForm("default_invoice_template", value)} />
                <TextField id="default_invoice_terms" label="Default invoice terms" value={form.default_invoice_terms} onChange={(value) => updateForm("default_invoice_terms", value)} />
                <TextField id="default_invoice_footer" label="Default invoice footer" value={form.default_invoice_footer} onChange={(value) => updateForm("default_invoice_footer", value)} />
                <CapabilityToggle
                  id="round_off_enabled"
                  title="Round off invoice totals"
                  description="Round invoice grand totals where the jurisdiction/accounting policy allows it."
                  checked={form.round_off_enabled}
                  onCheckedChange={(checked) => updateForm("round_off_enabled", checked)}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" />
                Capabilities
              </CardTitle>
              <CardDescription>
                Keep these tenant-level switches aligned with plan entitlements and
                backend feature flags.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                {capabilityToggles.map((item) => (
                  <CapabilityToggle
                    key={item.key}
                    id={item.key}
                    title={item.title}
                    description={item.description}
                    checked={Boolean(form[item.key])}
                    onCheckedChange={(checked) => updateForm(item.key, checked)}
                  />
                ))}
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" />
            Backend feature flags
          </CardTitle>
          <CardDescription>
            Read-only view of explicit feature flags returned by auth-service. The
            tenant capability switches above are the editable organization settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featureFlags.length ? (
            <div className="flex flex-wrap gap-2">
              {featureFlags.map((flag) => (
                <Badge key={flag.flag_key} variant={flag.is_enabled ? "default" : "outline"}>
                  {flag.flag_key}: {flag.is_enabled ? "on" : "off"}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No explicit feature flags are configured for this organization yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode
  label: string
  value: string
  helper: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-0">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
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
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  )
}

function CapabilityToggle({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal" className="rounded-lg border p-4">
      <input
        id={id}
        name={id}
        type="checkbox"
        className="mt-1 h-4 w-4 accent-primary"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <FieldContent>
        <FieldTitle>{title}</FieldTitle>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
    </Field>
  )
}
