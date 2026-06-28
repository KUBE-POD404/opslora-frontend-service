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
import { MetricCard, OperationsPage, Panel, PanelToolbar } from "@/components/operations/page-chrome"

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
    <OperationsPage
      eyebrow="Customer workspace"
      title="Know every buyer before the next order."
      description="Manage customer profiles, tax details, addresses, portal access, and account status in one workspace."
      primaryAction={(
        <Button asChild className="h-10 rounded-[9px]">
          <Link href="/customers/new">
            <Plus className="h-4 w-4" />
            New customer
          </Link>
        </Button>
      )}
      showHero={false}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Shown" value={filteredCustomers.length} helper={loading ? "Loading..." : `Page ${page}`} />
        <MetricCard label="Active" value={activeCustomers} helper="Ready for orders" tone="ok" />
        <MetricCard label="Portal enabled" value={portalEnabled} helper="Customer self-service" />
      </div>

      <Panel>
        <PanelToolbar>
        <div className="grid w-full gap-3 xl:grid-cols-[minmax(240px,1fr)_160px_160px_170px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search customers, email, phone, GSTIN"
            className="h-10 rounded-[9px] border-border bg-muted/40 pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setPage(1)
            setStatusFilter(value)
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-[9px] border-border bg-muted/40">
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
          <SelectTrigger className="h-10 w-full rounded-[9px] border-border bg-muted/40">
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
          <SelectTrigger className="h-10 w-full rounded-[9px] border-border bg-muted/40">
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
          className="h-10 rounded-[9px] border-border bg-muted/40"
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
        </PanelToolbar>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-3 text-xs">
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
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
              >
                {label}
              </button>
            )
          })}
          <span className="ml-auto text-muted-foreground">
            Showing {filteredCustomers.length} of {customers.length}
          </span>
        </div>
      </Panel>

      <Panel>
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
                    <div className="font-medium text-foreground">{customer.name}</div>
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
                  <div className="font-medium text-foreground">No customers found</div>
                  <div className="text-sm text-muted-foreground">
                    {search.trim() ? "Try a different search term." : "Create your first customer to start orders and invoices."}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>

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
    </OperationsPage>
  )
}
