"use client"

import { useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Search } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Customer } from "@/components/customers/customer-form"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const limit = 15

  const activeCustomers = customers.filter((customer) => customer.status === "ACTIVE").length
  const portalEnabled = customers.filter((customer) => customer.portal_access_enabled).length

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        })
        if (search.trim()) params.set("search", search.trim())
        const data = await apiFetch<Customer[]>(`/customers/?${params.toString()}`)
        setCustomers(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load customers")
      } finally {
        setLoading(false)
      }
    }

    const timeout = window.setTimeout(loadCustomers, 200)
    return () => window.clearTimeout(timeout)
  }, [page, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#12141a]">Customers</h1>
          <p className="text-sm text-[#6b707d]">
            Manage buyer profiles, tax details, addresses, and portal access.
          </p>
        </div>

        <Button asChild className="h-9 rounded-md">
          <Link href="/customers/new">
            <Plus className="h-4 w-4" />
            New customer
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Shown" value={customers.length} helper={loading ? "Loading..." : `Page ${page}`} />
        <Metric label="Active" value={activeCustomers} helper="Ready for orders" />
        <Metric label="Portal enabled" value={portalEnabled} helper="Customer self-service" />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-[#e0e4eb] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b707d]" />
          <Input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search customers, email, phone, GSTIN"
            className="h-9 rounded-md pl-9"
          />
        </div>
        <div className="text-sm text-[#6b707d]">
          {search.trim() ? "Filtered results" : "All customers"}
        </div>
      </div>

      <div className="rounded-lg border border-[#e0e4eb] bg-white">
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
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="font-medium text-[#12141a]">{customer.name}</div>
                    <div className="text-sm text-[#6b707d]">
                      {customer.display_name || `ID ${customer.id}`}
                    </div>
                  </TableCell>
                  <TableCell>{customer.customer_type}</TableCell>
                  <TableCell>
                    <div>{customer.email}</div>
                    <div className="text-sm text-[#6b707d]">
                      {customer.phone || "No phone"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{customer.gstin || customer.tax_id || "Not set"}</div>
                    <div className="text-sm text-[#6b707d]">
                      {customer.place_of_supply || customer.billing_state || ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={customer.portal_access_enabled ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                      {customer.portal_access_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={customer.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/customers/${customer.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

            {!loading && customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="font-medium text-[#12141a]">No customers found</div>
                  <div className="text-sm text-[#6b707d]">
                    {search.trim() ? "Try a different search term." : "Create your first customer to start orders and invoices."}
                  </div>
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
              onClick={(event) => {
                event.preventDefault()
                if (!loading && page > 1) setPage((value) => value - 1)
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
              onClick={(event) => {
                event.preventDefault()
                if (!loading && customers.length === limit) {
                  setPage((value) => value + 1)
                }
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

function Metric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-lg border border-[#e0e4eb] bg-white p-4">
      <div className="text-sm text-[#6b707d]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#12141a]">{value}</div>
      <div className="text-sm text-[#6b707d]">{helper}</div>
    </div>
  )
}
