"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  buildCustomerPayload,
  CustomerForm,
  type Customer,
  type CustomerFormValue,
} from "@/components/customers/customer-form"

export default function CreateCustomerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(value: CustomerFormValue) {
    if (!value.name.trim() || !value.email.trim()) {
      toast.error("Name and email are required")
      return
    }

    try {
      setSaving(true)
      await apiFetch<Customer>("/customers/create-customer", {
        method: "POST",
        body: JSON.stringify(buildCustomerPayload(value)),
      })
      toast.success("Customer created")
      router.push("/customers")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create customer")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Create Customer</h1>
          <p className="text-sm text-muted-foreground">
            Add customer master data used by orders, invoices, portal access, and reporting.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </div>

      <CustomerForm
        submitLabel="Create customer"
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
