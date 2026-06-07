"use client"

import { type ReactNode, useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CustomerType = "BUSINESS" | "INDIVIDUAL"
export type CustomerStatus = "ACTIVE" | "INACTIVE"

export type Customer = {
  id: number
  name: string
  display_name?: string | null
  email: string
  phone?: string | null
  customer_type: CustomerType
  status: CustomerStatus
  contact_person_name?: string | null
  contact_person_email?: string | null
  contact_person_phone?: string | null
  tax_id?: string | null
  gstin?: string | null
  tax_registration_type?: string | null
  place_of_supply?: string | null
  billing_address_line1?: string | null
  billing_address_line2?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_postal_code?: string | null
  billing_country?: string | null
  shipping_same_as_billing: boolean
  shipping_address_line1?: string | null
  shipping_address_line2?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  shipping_postal_code?: string | null
  shipping_country?: string | null
  payment_terms_days?: number | null
  notes?: string | null
  portal_access_enabled: boolean
  created_at: string
  updated_at?: string | null
  portal_invited_at?: string | null
}

export type CustomerFormValue = {
  name: string
  display_name: string
  email: string
  phone: string
  customer_type: CustomerType
  status: CustomerStatus
  contact_person_name: string
  contact_person_email: string
  contact_person_phone: string
  tax_id: string
  gstin: string
  tax_registration_type: string
  place_of_supply: string
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_state: string
  billing_postal_code: string
  billing_country: string
  shipping_same_as_billing: boolean
  shipping_address_line1: string
  shipping_address_line2: string
  shipping_city: string
  shipping_state: string
  shipping_postal_code: string
  shipping_country: string
  payment_terms_days: string
  notes: string
  portal_access_enabled: boolean
}

export const emptyCustomerForm: CustomerFormValue = {
  name: "",
  display_name: "",
  email: "",
  phone: "",
  customer_type: "BUSINESS",
  status: "ACTIVE",
  contact_person_name: "",
  contact_person_email: "",
  contact_person_phone: "",
  tax_id: "",
  gstin: "",
  tax_registration_type: "",
  place_of_supply: "",
  billing_address_line1: "",
  billing_address_line2: "",
  billing_city: "",
  billing_state: "",
  billing_postal_code: "",
  billing_country: "India",
  shipping_same_as_billing: true,
  shipping_address_line1: "",
  shipping_address_line2: "",
  shipping_city: "",
  shipping_state: "",
  shipping_postal_code: "",
  shipping_country: "India",
  payment_terms_days: "",
  notes: "",
  portal_access_enabled: false,
}

export function customerToForm(customer: Customer): CustomerFormValue {
  return {
    ...emptyCustomerForm,
    ...customer,
    display_name: customer.display_name ?? "",
    phone: customer.phone ?? "",
    contact_person_name: customer.contact_person_name ?? "",
    contact_person_email: customer.contact_person_email ?? "",
    contact_person_phone: customer.contact_person_phone ?? "",
    tax_id: customer.tax_id ?? "",
    gstin: customer.gstin ?? "",
    tax_registration_type: customer.tax_registration_type ?? "",
    place_of_supply: customer.place_of_supply ?? "",
    billing_address_line1: customer.billing_address_line1 ?? "",
    billing_address_line2: customer.billing_address_line2 ?? "",
    billing_city: customer.billing_city ?? "",
    billing_state: customer.billing_state ?? "",
    billing_postal_code: customer.billing_postal_code ?? "",
    billing_country: customer.billing_country ?? "",
    shipping_address_line1: customer.shipping_address_line1 ?? "",
    shipping_address_line2: customer.shipping_address_line2 ?? "",
    shipping_city: customer.shipping_city ?? "",
    shipping_state: customer.shipping_state ?? "",
    shipping_postal_code: customer.shipping_postal_code ?? "",
    shipping_country: customer.shipping_country ?? "",
    payment_terms_days: customer.payment_terms_days
      ? String(customer.payment_terms_days)
      : "",
    notes: customer.notes ?? "",
  }
}

export function buildCustomerPayload(form: CustomerFormValue) {
  return {
    ...form,
    payment_terms_days: form.payment_terms_days
      ? Number(form.payment_terms_days)
      : null,
  }
}

type CustomerFormProps = {
  initialValue?: CustomerFormValue
  submitLabel: string
  saving?: boolean
  onSubmit: (value: CustomerFormValue) => void
}

export function CustomerForm({
  initialValue = emptyCustomerForm,
  submitLabel,
  saving = false,
  onSubmit,
}: CustomerFormProps) {
  const [form, setForm] = useState<CustomerFormValue>(initialValue)

  useEffect(() => {
    setForm(initialValue)
  }, [initialValue])

  function setField<K extends keyof CustomerFormValue>(
    key: K,
    value: CustomerFormValue[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(form)
      }}
    >
      <FormSection
        title="Profile"
        description="Core customer identity used across orders, invoices, and reporting."
      >
        <Field label="Legal name" required>
          <Input
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </Field>
        <Field label="Display name">
          <Input
            value={form.display_name}
            onChange={(event) => setField("display_name", event.target.value)}
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
          />
        </Field>
        <Field label="Customer type">
          <Select
            value={form.customer_type}
            onValueChange={(value) =>
              setField("customer_type", value as CustomerType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUSINESS">Business</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onValueChange={(value) => setField("status", value as CustomerStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FormSection>

      <FormSection
        title="Contact"
        description="Operational contact person and payment terms."
      >
        <Field label="Contact person">
          <Input
            value={form.contact_person_name}
            onChange={(event) =>
              setField("contact_person_name", event.target.value)
            }
          />
        </Field>
        <Field label="Contact email">
          <Input
            type="email"
            value={form.contact_person_email}
            onChange={(event) =>
              setField("contact_person_email", event.target.value)
            }
          />
        </Field>
        <Field label="Contact phone">
          <Input
            value={form.contact_person_phone}
            onChange={(event) =>
              setField("contact_person_phone", event.target.value)
            }
          />
        </Field>
        <Field label="Payment terms">
          <Input
            type="number"
            min="0"
            max="365"
            value={form.payment_terms_days}
            onChange={(event) =>
              setField("payment_terms_days", event.target.value)
            }
          />
        </Field>
      </FormSection>

      <FormSection
        title="Tax"
        description="Tax details are snapshotted onto orders and invoices."
      >
        <Field label="GSTIN">
          <Input
            value={form.gstin}
            onChange={(event) =>
              setField("gstin", event.target.value.toUpperCase())
            }
          />
        </Field>
        <Field label="Tax ID">
          <Input
            value={form.tax_id}
            onChange={(event) => setField("tax_id", event.target.value)}
          />
        </Field>
        <Field label="Tax registration">
          <Input
            value={form.tax_registration_type}
            onChange={(event) =>
              setField("tax_registration_type", event.target.value)
            }
          />
        </Field>
        <Field label="Place of supply">
          <Input
            value={form.place_of_supply}
            onChange={(event) => setField("place_of_supply", event.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="Billing address">
        <Field label="Address line 1">
          <Input
            value={form.billing_address_line1}
            onChange={(event) =>
              setField("billing_address_line1", event.target.value)
            }
          />
        </Field>
        <Field label="Address line 2">
          <Input
            value={form.billing_address_line2}
            onChange={(event) =>
              setField("billing_address_line2", event.target.value)
            }
          />
        </Field>
        <Field label="City">
          <Input
            value={form.billing_city}
            onChange={(event) => setField("billing_city", event.target.value)}
          />
        </Field>
        <Field label="State">
          <Input
            value={form.billing_state}
            onChange={(event) => setField("billing_state", event.target.value)}
          />
        </Field>
        <Field label="Postal code">
          <Input
            value={form.billing_postal_code}
            onChange={(event) =>
              setField("billing_postal_code", event.target.value)
            }
          />
        </Field>
        <Field label="Country">
          <Input
            value={form.billing_country}
            onChange={(event) => setField("billing_country", event.target.value)}
          />
        </Field>
      </FormSection>

      <section className="rounded-md border bg-card p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.shipping_same_as_billing}
            onChange={(event) =>
              setField("shipping_same_as_billing", event.target.checked)
            }
            className="h-4 w-4 rounded border"
          />
          Shipping address is same as billing
        </label>
      </section>

      {!form.shipping_same_as_billing && (
        <FormSection title="Shipping address">
          <Field label="Address line 1">
            <Input
              value={form.shipping_address_line1}
              onChange={(event) =>
                setField("shipping_address_line1", event.target.value)
              }
            />
          </Field>
          <Field label="Address line 2">
            <Input
              value={form.shipping_address_line2}
              onChange={(event) =>
                setField("shipping_address_line2", event.target.value)
              }
            />
          </Field>
          <Field label="City">
            <Input
              value={form.shipping_city}
              onChange={(event) => setField("shipping_city", event.target.value)}
            />
          </Field>
          <Field label="State">
            <Input
              value={form.shipping_state}
              onChange={(event) => setField("shipping_state", event.target.value)}
            />
          </Field>
          <Field label="Postal code">
            <Input
              value={form.shipping_postal_code}
              onChange={(event) =>
                setField("shipping_postal_code", event.target.value)
              }
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.shipping_country}
              onChange={(event) =>
                setField("shipping_country", event.target.value)
              }
            />
          </Field>
        </FormSection>
      )}

      <FormSection
        title="Portal and notes"
        description="Portal access also depends on tenant-level portal settings."
      >
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.portal_access_enabled}
            onChange={(event) =>
              setField("portal_access_enabled", event.target.checked)
            }
            className="h-4 w-4 rounded border"
          />
          Enable customer portal access
        </label>
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <textarea
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
            className="mt-2 min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </FormSection>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t bg-background/95 p-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}
