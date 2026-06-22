"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  buildCustomerPayload,
  CustomerForm,
  customerToForm,
  type Customer,
  type CustomerFormValue,
} from "@/components/customers/customer-form"

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const customerId = params.id
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadCustomer() {
      try {
        setLoading(true)
        const data = await apiFetch<Customer>(`/customers/${customerId}`)
        setCustomer(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load customer")
      } finally {
        setLoading(false)
      }
    }

    loadCustomer()
  }, [customerId])

  async function handleSubmit(value: CustomerFormValue) {
    if (!value.name.trim() || !value.email.trim()) {
      toast.error("Name and email are required")
      return
    }

    try {
      setSaving(true)
      await apiFetch<Customer>(`/customers/${customerId}`, {
        method: "PUT",
        body: JSON.stringify(buildCustomerPayload(value)),
      })
      toast.success("Customer updated")
      router.push("/customers")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update customer")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit Customer</h1>
          <p className="text-sm text-muted-foreground">
            Update customer profile, tax, address, payment terms, and portal access.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center rounded-md border py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && customer && (
        <CustomerForm
          initialValue={customerToForm(customer)}
          submitLabel="Save changes"
          saving={saving}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
