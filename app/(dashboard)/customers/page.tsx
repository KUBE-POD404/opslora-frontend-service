"use client"

import { useEffect, useState } from "react"
import { Eye, Loader2, Pencil, Plus, Search } from "lucide-react"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage buyer profiles, tax details, addresses, and portal access.
          </p>
        </div>

        <Button asChild>
          <Link href="/customers/new">
            <Plus className="h-4 w-4" />
            Create Customer
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search customers, email, phone, GSTIN"
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${customers.length} shown`}
        </div>
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
                    <Button asChild variant="ghost" size="icon" title="Edit customer">
                      <Link href={`/customers/${customer.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon" title="View customer">
                      <Link href={`/customers/${customer.id}/edit`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

            {!loading && customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
