"use client"

import { type ReactNode, useEffect, useState } from "react"
import { Loader2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type CustomerType = "BUSINESS" | "INDIVIDUAL"
type CustomerStatus = "ACTIVE" | "INACTIVE"

type Customer = {
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

type CustomerForm = {
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

const emptyForm: CustomerForm = {
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

function customerToForm(customer: Customer): CustomerForm {
    return {
        ...emptyForm,
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

function buildPayload(form: CustomerForm) {
    return {
        ...form,
        payment_terms_days: form.payment_terms_days
            ? Number(form.payment_terms_days)
            : null,
    }
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [open, setOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [form, setForm] = useState<CustomerForm>(emptyForm)
    const [saving, setSaving] = useState(false)
    const limit = 15

    async function loadCustomers(currentPage = page) {
        try {
            setLoading(true)
            const data = await apiFetch<Customer[]>(
                `/customers/?page=${currentPage}&limit=${limit}`
            )
            setCustomers(data)
        } catch {
            toast.error("Failed to load customers")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCustomers()
    }, [page])

    function setField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    function openCreateDialog() {
        setEditingCustomer(null)
        setForm(emptyForm)
        setOpen(true)
    }

    function openEditDialog(customer: Customer) {
        setEditingCustomer(customer)
        setForm(customerToForm(customer))
        setOpen(true)
    }

    async function handleSave() {
        if (!form.name.trim() || !form.email.trim()) {
            toast.error("Name and email are required")
            return
        }

        try {
            setSaving(true)
            const payload = buildPayload(form)

            if (editingCustomer) {
                const updated = await apiFetch<Customer>(
                    `/customers/${editingCustomer.id}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(payload),
                    }
                )
                setCustomers(prev =>
                    prev.map(customer =>
                        customer.id === updated.id ? updated : customer
                    )
                )
                toast.success("Customer updated")
            } else {
                const created = await apiFetch<Customer>(
                    "/customers/create-customer",
                    {
                        method: "POST",
                        body: JSON.stringify(payload),
                    }
                )
                setCustomers(prev => [created, ...prev])
                toast.success("Customer created")
            }

            setOpen(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save customer")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Customers</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage buyer profiles, tax details, addresses, and portal access.
                    </p>
                </div>

                <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4" />
                    Create Customer
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Tax</TableHead>
                            <TableHead>Portal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading &&
                            customers.map(customer => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {customer.display_name || `ID ${customer.id}`}
                                        </div>
                                    </TableCell>
                                    <TableCell>{customer.customer_type}</TableCell>
                                    <TableCell>
                                        <div>{customer.email}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {customer.phone || "No phone"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>{customer.gstin || customer.tax_id || "Not set"}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {customer.place_of_supply || customer.billing_state || ""}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={customer.portal_access_enabled ? "default" : "secondary"}>
                                            {customer.portal_access_enabled ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={customer.status === "ACTIVE" ? "default" : "secondary"}>
                                            {customer.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(customer)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                        {!loading && customers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                    No customers found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={event => {
                                event.preventDefault()
                                if (!loading && page > 1) setPage(value => value - 1)
                            }}
                        />
                    </PaginationItem>

                    <PaginationItem>
                        <PaginationLink href="#" isActive>
                            {page}
                        </PaginationLink>
                    </PaginationItem>

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={event => {
                                event.preventDefault()
                                if (!loading && customers.length === limit) {
                                    setPage(value => value + 1)
                                }
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCustomer ? "Edit Customer" : "Create Customer"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6">
                        <FormSection title="Profile">
                            <Field label="Legal name">
                                <Input value={form.name} onChange={event => setField("name", event.target.value)} />
                            </Field>
                            <Field label="Display name">
                                <Input value={form.display_name} onChange={event => setField("display_name", event.target.value)} />
                            </Field>
                            <Field label="Email">
                                <Input type="email" value={form.email} onChange={event => setField("email", event.target.value)} />
                            </Field>
                            <Field label="Phone">
                                <Input value={form.phone} onChange={event => setField("phone", event.target.value)} />
                            </Field>
                            <Field label="Customer type">
                                <Select value={form.customer_type} onValueChange={value => setField("customer_type", value as CustomerType)}>
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
                                <Select value={form.status} onValueChange={value => setField("status", value as CustomerStatus)}>
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

                        <FormSection title="Contact">
                            <Field label="Contact person">
                                <Input value={form.contact_person_name} onChange={event => setField("contact_person_name", event.target.value)} />
                            </Field>
                            <Field label="Contact email">
                                <Input type="email" value={form.contact_person_email} onChange={event => setField("contact_person_email", event.target.value)} />
                            </Field>
                            <Field label="Contact phone">
                                <Input value={form.contact_person_phone} onChange={event => setField("contact_person_phone", event.target.value)} />
                            </Field>
                            <Field label="Payment terms">
                                <Input type="number" min="0" max="365" value={form.payment_terms_days} onChange={event => setField("payment_terms_days", event.target.value)} />
                            </Field>
                        </FormSection>

                        <FormSection title="Tax">
                            <Field label="GSTIN">
                                <Input value={form.gstin} onChange={event => setField("gstin", event.target.value.toUpperCase())} />
                            </Field>
                            <Field label="Tax ID">
                                <Input value={form.tax_id} onChange={event => setField("tax_id", event.target.value)} />
                            </Field>
                            <Field label="Tax registration">
                                <Input value={form.tax_registration_type} onChange={event => setField("tax_registration_type", event.target.value)} />
                            </Field>
                            <Field label="Place of supply">
                                <Input value={form.place_of_supply} onChange={event => setField("place_of_supply", event.target.value)} />
                            </Field>
                        </FormSection>

                        <FormSection title="Billing Address">
                            <Field label="Address line 1">
                                <Input value={form.billing_address_line1} onChange={event => setField("billing_address_line1", event.target.value)} />
                            </Field>
                            <Field label="Address line 2">
                                <Input value={form.billing_address_line2} onChange={event => setField("billing_address_line2", event.target.value)} />
                            </Field>
                            <Field label="City">
                                <Input value={form.billing_city} onChange={event => setField("billing_city", event.target.value)} />
                            </Field>
                            <Field label="State">
                                <Input value={form.billing_state} onChange={event => setField("billing_state", event.target.value)} />
                            </Field>
                            <Field label="Postal code">
                                <Input value={form.billing_postal_code} onChange={event => setField("billing_postal_code", event.target.value)} />
                            </Field>
                            <Field label="Country">
                                <Input value={form.billing_country} onChange={event => setField("billing_country", event.target.value)} />
                            </Field>
                        </FormSection>

                        <div className="flex items-center gap-2">
                            <input
                                id="shipping_same_as_billing"
                                type="checkbox"
                                checked={form.shipping_same_as_billing}
                                onChange={event => setField("shipping_same_as_billing", event.target.checked)}
                                className="h-4 w-4 rounded border"
                            />
                            <Label htmlFor="shipping_same_as_billing">Shipping address is same as billing</Label>
                        </div>

                        {!form.shipping_same_as_billing && (
                            <FormSection title="Shipping Address">
                                <Field label="Address line 1">
                                    <Input value={form.shipping_address_line1} onChange={event => setField("shipping_address_line1", event.target.value)} />
                                </Field>
                                <Field label="Address line 2">
                                    <Input value={form.shipping_address_line2} onChange={event => setField("shipping_address_line2", event.target.value)} />
                                </Field>
                                <Field label="City">
                                    <Input value={form.shipping_city} onChange={event => setField("shipping_city", event.target.value)} />
                                </Field>
                                <Field label="State">
                                    <Input value={form.shipping_state} onChange={event => setField("shipping_state", event.target.value)} />
                                </Field>
                                <Field label="Postal code">
                                    <Input value={form.shipping_postal_code} onChange={event => setField("shipping_postal_code", event.target.value)} />
                                </Field>
                                <Field label="Country">
                                    <Input value={form.shipping_country} onChange={event => setField("shipping_country", event.target.value)} />
                                </Field>
                            </FormSection>
                        )}

                        <FormSection title="Portal And Notes">
                            <div className="flex items-center gap-2">
                                <input
                                    id="portal_access_enabled"
                                    type="checkbox"
                                    checked={form.portal_access_enabled}
                                    onChange={event => setField("portal_access_enabled", event.target.checked)}
                                    className="h-4 w-4 rounded border"
                                />
                                <Label htmlFor="portal_access_enabled">Enable customer portal access</Label>
                            </div>
                            <div className="md:col-span-2">
                                <Label>Notes</Label>
                                <textarea
                                    value={form.notes}
                                    onChange={event => setField("notes", event.target.value)}
                                    className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                        </FormSection>

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? "Saving..." : editingCustomer ? "Update" : "Create"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function FormSection({
    title,
    children,
}: {
    title: string
    children: ReactNode
}) {
    return (
        <section className="grid gap-4">
            <h2 className="text-sm font-medium">{title}</h2>
            <div className="grid gap-4 md:grid-cols-2">{children}</div>
        </section>
    )
}

function Field({
    label,
    children,
}: {
    label: string
    children: ReactNode
}) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
        </div>
    )
}
