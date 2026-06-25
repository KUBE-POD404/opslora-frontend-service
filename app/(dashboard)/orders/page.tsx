/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Check, Eye, FileText, Loader2, PackageSearch, Pencil, Plus, Search, X } from "lucide-react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

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

import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { MetricCard, OperationsPage, Panel, PanelToolbar } from "@/components/operations/page-chrome"

/* ================= TYPES ================= */

type Customer = {
    id: number
    name: string
}

type OrderItem = {
    product_id?: number | null
    sku?: string | null
    product_name: string
    quantity: number
    unit_price: number
    tax_rate?: number | null
    unit_of_measure?: string | null
}

type Product = {
    id: number
    name: string
    sku: string
    unit_of_measure: string
    sale_price: number | string
    tax_rate: number | string
    is_active: boolean
}

type Order = {
    id: number
    customer_id: number
    status: string
    created_at: string
    total: number
    items: OrderItem[]
}

type Invoice = {
    id: number
    order_id: number
}

function money(value: number) {
    return `Rs ${Number(value || 0).toFixed(2)}`
}

function statusClass(status: string) {
    if (status === "CONFIRMED") return "border-emerald-200 bg-emerald-50 text-emerald-700"
    if (status === "CREATED") return "border-amber-200 bg-amber-50 text-amber-300"
    return "border-red-200 bg-red-50 text-red-700"
}

/* ================= PAGE ================= */

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    /* pagination */
    const [page, setPage] = useState(1)
    const limit = 20

    /* dialogs */
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [viewOrder, setViewOrder] = useState<Order | null>(null)
    const [editingOrder, setEditingOrder] = useState<Order | null>(null)
    const [cancelOrderTarget, setCancelOrderTarget] = useState<Order | null>(null)
    const [invoiceMap, setInvoiceMap] = useState<Record<number, boolean>>({})

    /* form */
    const [customerId, setCustomerId] = useState("")
    const [items, setItems] = useState<OrderItem[]>([
        { product_id: null, product_name: "", quantity: 1, unit_price: 0 }
    ])


    /* filters */
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [customerFilter, setCustomerFilter] = useState<string | null>(null)
    const [query, setQuery] = useState("")

    const router = useRouter()
    const createdCount = orders.filter(order => order.status === "CREATED").length
    const confirmedCount = orders.filter(order => order.status === "CONFIRMED").length
    const uninvoicedCount = orders.filter(order => order.status === "CONFIRMED" && !invoiceMap[order.id]).length
    const activeFilterCount = [statusFilter, customerFilter, query.trim()].filter(Boolean).length
    const filteredOrders = useMemo(() => {
        const needle = query.trim().toLowerCase()

        return orders.filter(order => {
            const customerName = customers.find(c => c.id === order.customer_id)?.name ?? ""
            if (!needle) return true

            return [
                String(order.id),
                customerName,
                order.status,
                String(order.total),
            ].some(value => value.toLowerCase().includes(needle))
        })
    }, [customers, orders, query])

    /* ================= LOAD DATA ================= */
    const loadOrders = useCallback(async function loadOrders(currentPage = page) {
        try {
            setLoading(true)

            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(limit),
            })

            if (statusFilter && statusFilter !== "ALL") {
                params.append("status", statusFilter)
            }

            if (customerFilter && customerFilter !== "ALL") {
                params.append("customer_id", customerFilter)
            }

            const [ordersData, customersData, invoicesData, productsData] = await Promise.all([
                apiFetch<Order[]>(`/orders/?${params.toString()}`),
                apiFetch<Customer[]>("/customers/"),
                apiFetch<Invoice[]>(`/invoices/`),
                apiFetch<Product[]>("/inventory/products?limit=100"),
            ])

            setOrders(ordersData)
            setCustomers(customersData)
            setProducts(productsData.filter(product => product.is_active))
            const map: Record<number, boolean> = {}

            invoicesData.forEach(inv => {
                map[inv.order_id] = true
            })

            setInvoiceMap(map)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }, [customerFilter, page, statusFilter])


    useEffect(() => {
        loadOrders()
    }, [loadOrders])


    /* ================= VIEW ================= */

    async function handleViewOrder(order: Order) {
        try {
            const full = await apiFetch<Order>(`/orders/${order.id}`)
            setViewOrder(full)
        } catch (err: any) {
            toast.error(err.message)
        }
    }
    /* ================= ITEMS ================= */

    function addItem() {
        setItems(prev => [
            ...prev,
            { product_id: null, product_name: "", quantity: 1, unit_price: 0 },
        ])
    }

    function removeItem(index: number) {
        setItems(prev => {
            if (prev.length === 1) return prev // always keep 1
            return prev.filter((_, i) => i !== index)
        })
    }

    function updateItem(
        index: number,
        field: keyof OrderItem,
        value: string | number
    ) {
        setItems(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        )
    }

    function selectProduct(index: number, value: string) {
        if (value === "MANUAL") {
            setItems(prev =>
                prev.map((item, i) =>
                    i === index
                        ? {
                            ...item,
                            product_id: null,
                            sku: null,
                            product_name: "",
                            unit_price: 0,
                            tax_rate: null,
                            unit_of_measure: null,
                        }
                        : item
                )
            )
            return
        }

        const product = products.find(p => p.id === Number(value))
        if (!product) return

        setItems(prev =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        product_id: product.id,
                        sku: product.sku,
                        product_name: product.name,
                        unit_price: Number(product.sale_price),
                        tax_rate: Number(product.tax_rate || 0),
                        unit_of_measure: product.unit_of_measure,
                    }
                    : item
            )
        )
    }



    /* ================= EDIT ================= */

    function openEditOrder(order: Order) {
        setEditingOrder(order)
        setCustomerId(String(order.customer_id))

        setItems(
            order.items.map(i => ({
                product_id: i.product_id ?? null,
                sku: i.sku ?? null,
                product_name: i.product_name,
                quantity: i.quantity,
                unit_price: i.unit_price,
                tax_rate: i.tax_rate ?? null,
                unit_of_measure: i.unit_of_measure ?? null,
            }))
        )

        setOpen(true)
    }


    /* ================= SAVE ================= */

    async function handleSaveOrder() {
        if (!customerId) {
            toast.error("Please select a customer")
            return
        }

        if (items.length === 0) {
            toast.error("Add at least one item")
            return
        }

        for (const item of items) {
            if (item.quantity <= 0) {
                toast.error("Each item must have a valid quantity")
                return
            }

            if (!item.product_id && (!item.product_name || item.unit_price <= 0)) {
                toast.error("Select an inventory product or enter a valid manual line")
                return
            }
        }

        const orderItems = items.map(item =>
            item.product_id
                ? {
                    product_id: item.product_id,
                    quantity: item.quantity,
                }
                : {
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                }
        )


        try {
            setSaving(true)

            if (editingOrder) {
                // UPDATE ORDER
                const updated = await apiFetch<Order>(`/orders/${editingOrder.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ items: orderItems }),
                })

                setOrders(prev =>
                    prev.map(o => (o.id === updated.id ? updated : o))
                )

                toast.success("Order updated")
            } else {
                // CREATE ORDER
                const created = await apiFetch<Order>("/orders/create-order/", {
                    method: "POST",
                    body: JSON.stringify({
                        customer_id: Number(customerId),
                        items: orderItems,
                    }),
                })

                setOrders(prev => [created, ...prev])
                toast.success("Order created")
            }

            // RESET FORM
            setOpen(false)
            setEditingOrder(null)
            setCustomerId("")
            setItems([{ product_id: null, product_name: "", quantity: 1, unit_price: 0 }])
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }
    /* ================= CONFIRM / CANCEL ================= */

    async function confirmOrder(id: number) {
        try {
            const updated = await apiFetch<Order>(`/orders/${id}/confirm`, {
                method: "POST",
            })
            setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)))
            toast.success("Order confirmed")
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    async function cancelOrder(id: number) {
        try {
            const updated = await apiFetch<Order>(`/orders/${id}/cancel`, {
                method: "POST",
            })
            setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)))
            toast.success("Order cancelled")
        } catch (err: any) {
            toast.error(err.message)
        }
    }
    /* ================= RENDER ================= */

    return (
        <OperationsPage
            eyebrow="Order workflow"
            title="Move customer orders from draft to invoice without losing context."
            description="Create orders, confirm sellable lines, and keep the order-to-invoice workflow moving."
            primaryAction={(
                <Button
                    className="h-10 rounded-[9px] bg-[#3f46d8] text-white hover:bg-[#4f57ef]"
                    onClick={() => {
                        setEditingOrder(null)
                        setCustomerId("")
                        setItems([{ product_id: null, product_name: "", quantity: 1, unit_price: 0 }])
                        setOpen(true)
                    }}
                >
                    <Plus className="h-4 w-4" />
                    Create order
                </Button>
            )}
              >
            <div className="grid gap-3 md:grid-cols-3">
                <MetricCard label="Draft orders" value={createdCount} helper="Need confirmation" tone={createdCount > 0 ? "warn" : "neutral"} />
                <MetricCard label="Confirmed" value={confirmedCount} helper="Ready for invoicing" tone="ok" />
                <MetricCard label="To invoice" value={uninvoicedCount} helper="No invoice yet" tone={uninvoicedCount > 0 ? "warn" : "neutral"} />
            </div>

            <Panel>
                <PanelToolbar>
                <div className="grid w-full gap-3 xl:grid-cols-[minmax(240px,1fr)_180px_240px_auto]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7d8797]" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search order, customer, status, amount"
                            className="h-10 rounded-[9px] border-white/10 bg-white/[0.04] pl-9"
                        />
                    </div>

                    <Select
                        value={statusFilter ?? "ALL"}
                        onValueChange={value => {
                            setPage(1)
                            setStatusFilter(value === "ALL" ? null : value)
                        }}
                    >
                        <SelectTrigger className="h-10 w-full rounded-[9px] border-white/10 bg-white/[0.04]">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All statuses</SelectItem>
                            <SelectItem value="CREATED">Draft</SelectItem>
                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={customerFilter ?? "ALL"}
                        onValueChange={value => {
                            setPage(1)
                            setCustomerFilter(value === "ALL" ? null : value)
                        }}
                    >
                        <SelectTrigger className="h-10 w-full rounded-[9px] border-white/10 bg-white/[0.04]">
                            <SelectValue placeholder="All customers" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All customers</SelectItem>
                            {customers.map(customer => (
                                <SelectItem key={customer.id} value={String(customer.id)}>
                                    {customer.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        className="h-10 rounded-[9px] border-white/10 bg-white/[0.04]"
                        disabled={activeFilterCount === 0}
                        onClick={() => {
                            setStatusFilter(null)
                            setCustomerFilter(null)
                            setQuery("")
                            setPage(1)
                        }}
                    >
                        <X className="size-4" />
                        Clear
                    </Button>
                </div>
                </PanelToolbar>

                <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-3 text-xs">
                    {[
                        ["ALL", "All"],
                        ["CREATED", "Draft"],
                        ["CONFIRMED", "Confirmed"],
                        ["CANCELLED", "Cancelled"],
                    ].map(([value, label]) => {
                        const active = (statusFilter ?? "ALL") === value
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => {
                                    setPage(1)
                                    setStatusFilter(value === "ALL" ? null : value)
                                }}
                                className={`rounded-full border px-3 py-1.5 transition ${active
                                    ? "border-[#3f46d8]/30 bg-[#f4f4ff] text-[#3f46d8]"
                                    : "border-white/10 bg-white/[0.04] text-[#8790a0] hover:text-[#f7f8fb]"
                                    }`}
                            >
                                {label}
                            </button>
                        )
                    })}
                    <span className="ml-auto text-[#8790a0]">
                        Showing {filteredOrders.length} of {orders.length}
                    </span>
                </div>
            </Panel>

            {/* TABLE */}
            <Panel>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading &&
                            filteredOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium text-[#12141a]">#{order.id}</TableCell>
                                    <TableCell>{customers.find(c => c.id === order.customer_id)?.name ?? "Unknown"}</TableCell>
                                    <TableCell>{money(order.total)}</TableCell>
                                    <TableCell>
                                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClass(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewOrder(order)}
                                        >
                                            <Eye className="size-3.5" />
                                            View
                                        </Button>

                                        {order.status === "CREATED" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditOrder(order)}
                                                >
                                                    <Pencil className="size-3.5" />
                                                    Edit
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    onClick={() => confirmOrder(order.id)}
                                                >
                                                    <Check className="size-3.5" />
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setCancelOrderTarget(order)}
                                                >
                                                    <X className="size-3.5" />
                                                    Cancel
                                                </Button>

                                            </>
                                        )}
                                        {order.status === "CONFIRMED" && !invoiceMap[order.id] && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    router.push(`/orders/${order.id}/create-invoice`)
                                                }
                                            >
                                                <FileText className="size-3.5" />
                                                Create Invoice
                                            </Button>
                                        )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        {!loading && filteredOrders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-12 text-center">
                                    <div className="font-medium text-[#12141a]">No orders found</div>
                                    <div className="text-sm text-[#6b707d]">Create an order once a customer and inventory item are ready.</div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Panel>

            {/* PAGINATION */}
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={e => {
                                e.preventDefault()
                                if (page > 1) setPage(p => p - 1)
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
                            onClick={e => {
                                e.preventDefault()
                                if (orders.length === limit) {
                                    setPage(p => p + 1)
                                }
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>


            {/* CREATE / EDIT */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingOrder ? "Edit Order" : "Create Order"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* CUSTOMER */}
                    <Label>Customer</Label>
                    <Select
                        value={customerId}
                        onValueChange={setCustomerId}
                        disabled={!!editingOrder}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                            {customers.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name} - {c.id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* ITEMS */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Order Items</Label>
                            <Button size="sm" variant="outline" onClick={addItem}>
                                + Add Item
                            </Button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end rounded-md border p-3">
                                <div className="col-span-12 md:col-span-5">
                                    <Label className="mb-2 block text-xs text-muted-foreground">Product</Label>
                                    <Select
                                        value={item.product_id ? String(item.product_id) : "MANUAL"}
                                        onValueChange={value => selectProduct(index, value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MANUAL">Manual line</SelectItem>
                                            {products.map(product => (
                                                <SelectItem key={product.id} value={String(product.id)}>
                                                    {product.name} - {product.sku}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-6 md:col-span-2">
                                    <Label className="mb-2 block text-xs text-muted-foreground">Qty</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={e =>
                                            updateItem(index, "quantity", +e.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-span-6 md:col-span-2">
                                    <Label className="mb-2 block text-xs text-muted-foreground">Unit price</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Unit price"
                                        value={item.unit_price}
                                        disabled={!!item.product_id}
                                        onChange={e =>
                                            updateItem(index, "unit_price", +e.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-span-10 md:col-span-2">
                                    <Label className="mb-2 block text-xs text-muted-foreground">
                                        {item.product_id ? "Snapshot" : "Name"}
                                    </Label>
                                    {item.product_id ? (
                                        <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
                                            <PackageSearch className="size-4 text-muted-foreground" />
                                            <span className="truncate">{item.sku || item.product_name}</span>
                                        </div>
                                    ) : (
                                        <Input
                                            placeholder="Product name"
                                            value={item.product_name}
                                            onChange={e =>
                                                updateItem(index, "product_name", e.target.value)
                                            }
                                        />
                                    )}
                                </div>

                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="col-span-2 md:col-span-1"
                                    onClick={() => removeItem(index)}
                                    disabled={items.length === 1}
                                >
                                    X
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* ACTION */}
                    <Button onClick={handleSaveOrder} disabled={saving}>
                        {saving
                            ? "Saving..."
                            : editingOrder
                                ? "Update Order"
                                : "Create Order"}
                    </Button>
                </DialogContent>
            </Dialog>

            {/* VIEW ITEMS */}
            <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Order #{viewOrder?.id}</DialogTitle>
                    </DialogHeader>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {viewOrder?.items.map((i, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{i.product_name}</TableCell>
                                    <TableCell>{i.quantity}</TableCell>
                                    <TableCell>{i.unit_price}</TableCell>
                                    <TableCell>{((i.quantity ?? 0) * (i.unit_price ?? 0)).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>
            {/* CANCEL ORDER */}
            <AlertDialog
                open={!!cancelOrderTarget}
                onOpenChange={() => setCancelOrderTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                            The order <strong>#{cancelOrderTarget?.id}</strong> will be permanently cancelled.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Order</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (cancelOrderTarget) {
                                    cancelOrder(cancelOrderTarget.id)
                                    setCancelOrderTarget(null)
                                }
                            }}
                        >
                            Yes, Cancel Order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </OperationsPage>
    )
}
