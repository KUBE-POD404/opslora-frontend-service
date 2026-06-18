"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Search, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [portalFilter, setPortalFilter] = useState("ALL")
  const limit = 15

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (statusFilter !== "ALL" && customer.status !== statusFilter) return false
      if (typeFilter !== "ALL" && customer.customer_type !== typeFilter) return false
      if (portalFilter === "ENABLED" && !customer.portal_access_enabled) return false
      if (portalFilter === "DISABLED" && customer.portal_access_enabled) return false
      return true
    })
  }, [customers, portalFilter, statusFilter, typeFilter])

  const activeCustomers = filteredCustomers.filter((customer) => customer.status === "ACTIVE").length
  const portalEnabled = filteredCustomers.filter((customer) => customer.portal_access_enabled).length
  const activeFilterCount = [
    search.trim(),
    statusFilter !== "ALL" ? statusFilter : "",
    typeFilter !== "ALL" ? typeFilter : "",
    portalFilter !== "ALL" ? portalFilter : "",
  ].filter(Boolean).length

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
        <Metric label="Shown" value={filteredCustomers.length} helper={loading ? "Loading..." : `Page ${page}`} />
        <Metric label="Active" value={activeCustomers} helper="Ready for orders" />
        <Metric label="Portal enabled" value={portalEnabled} helper="Customer self-service" />
      </div>

      <div className="rounded-lg border border-white/10 bg-[#141922] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_160px_160px_170px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b707d]" />
          <Input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search customers, email, phone, GSTIN"
            className="h-10 rounded-md border-white/10 bg-[#0c1017] pl-9 text-[#e8edf4] placeholder:text-[#697386]"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setPage(1)
            setStatusFilter(value)
          }}
        >
          <SelectTrigger className="h-10 w-full border-white/10 bg-[#0c1017] text-[#e8edf4]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setPage(1)
            setTypeFilter(value)
          }}
        >
          <SelectTrigger className="h-10 w-full border-white/10 bg-[#0c1017] text-[#e8edf4]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="BUSINESS">Business</SelectItem>
            <SelectItem value="INDIVIDUAL">Individual</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={portalFilter}
          onValueChange={(value) => {
            setPage(1)
            setPortalFilter(value)
          }}
        >
          <SelectTrigger className="h-10 w-full border-white/10 bg-[#0c1017] text-[#e8edf4]">
            <SelectValue placeholder="Portal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Portal access</SelectItem>
            <SelectItem value="ENABLED">Enabled</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="h-10 border-white/10 bg-white/[0.03] text-[#d9e2ee] hover:bg-white/[0.07]"
          disabled={activeFilterCount === 0}
          onClick={() => {
            setSearch("")
            setStatusFilter("ALL")
            setTypeFilter("ALL")
            setPortalFilter("ALL")
            setPage(1)
          }}
        >
          <X className="size-4" />
          Clear
        </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {[
            ["ALL", "All customers"],
            ["ACTIVE", "Active"],
            ["INACTIVE", "Inactive"],
          ].map(([value, label]) => {
            const active = statusFilter === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full border px-3 py-1.5 transition ${active
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-[#8790a0] hover:text-[#d9e2ee]"
                  }`}
              >
                {label}
              </button>
            )
          })}
          <span className="ml-auto text-[#7d8797]">
            Showing {filteredCustomers.length} of {customers.length}
          </span>
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
              filteredCustomers.map((customer) => (
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

            {!loading && filteredCustomers.length === 0 && (
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
