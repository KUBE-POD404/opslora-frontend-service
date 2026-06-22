/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2, PackagePlus, RotateCw, Search, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"

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
import { apiFetch } from "@/lib/api"

type Product = {
  id: number
  name: string
  sku: string
  description?: string | null
  hsn_sac_code?: string | null
  unit_of_measure: string
  sale_price: number | string
  tax_rate: number | string
  is_active: boolean
  created_at: string
}

type StockBalance = {
  product_id: number
  quantity_on_hand: number | string
  low_stock_threshold: number | string
  updated_at: string
}

type ProductForm = {
  name: string
  sku: string
  description: string
  hsn_sac_code: string
  unit_of_measure: string
  sale_price: string
  tax_rate: string
  low_stock_threshold: string
  is_active: boolean
}

const emptyProductForm: ProductForm = {
  name: "",
  sku: "",
  description: "",
  hsn_sac_code: "",
  unit_of_measure: "PCS",
  sale_price: "",
  tax_rate: "0",
  low_stock_threshold: "0",
  is_active: true,
}

function money(value: number | string) {
  return `Rs ${Number(value || 0).toFixed(2)}`
}

function quantity(value: number | string) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function productToForm(product: Product, stock?: StockBalance): ProductForm {
  return {
    name: product.name,
    sku: product.sku,
    description: product.description || "",
    hsn_sac_code: product.hsn_sac_code || "",
    unit_of_measure: product.unit_of_measure,
    sale_price: String(product.sale_price),
    tax_rate: String(product.tax_rate),
    low_stock_threshold: stock ? String(stock.low_stock_threshold) : "0",
    is_active: product.is_active,
  }
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stockByProduct, setStockByProduct] = useState<Record<number, StockBalance>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [activeOnly, setActiveOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm)
  const [stockOpen, setStockOpen] = useState(false)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockMovement, setStockMovement] = useState("IN")
  const [stockQuantity, setStockQuantity] = useState("")
  const [stockReason, setStockReason] = useState("")

  const loadInventory = useCallback(async function loadInventory() {
    try {
      setLoading(true)
      const productData = await apiFetch<Product[]>("/inventory/products?limit=100")
      setProducts(productData)

      const stockResults = await Promise.allSettled(
        productData.map((product) =>
          apiFetch<StockBalance>(`/inventory/stock/${product.id}`)
        )
      )
      const nextStock: Record<number, StockBalance> = {}

      stockResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          nextStock[productData[index].id] = result.value
        }
      })

      setStockByProduct(nextStock)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return products.filter((product) => {
      if (activeOnly && !product.is_active) return false
      if (!needle) return true

      return [product.name, product.sku, product.hsn_sac_code, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [activeOnly, products, query])

  const metrics = useMemo(() => {
    const activeProducts = products.filter((product) => product.is_active).length
    const lowStock = products.filter((product) => {
      const stock = stockByProduct[product.id]
      if (!stock) return false

      return Number(stock.quantity_on_hand) <= Number(stock.low_stock_threshold)
    }).length

    return {
      activeProducts,
      lowStock,
      totalSkus: products.length,
    }
  }, [products, stockByProduct])

  function openCreateProduct() {
    setEditingProduct(null)
    setProductForm(emptyProductForm)
    setFormOpen(true)
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product)
    setProductForm(productToForm(product, stockByProduct[product.id]))
    setFormOpen(true)
  }

  function openStockAdjustment(product: Product) {
    setStockProduct(product)
    setStockMovement("IN")
    setStockQuantity("")
    setStockReason("")
    setStockOpen(true)
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!productForm.name || !productForm.sku || !productForm.sale_price) {
      toast.error("Name, SKU, and sale price are required")
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: productForm.name,
        sku: productForm.sku,
        description: productForm.description || null,
        hsn_sac_code: productForm.hsn_sac_code || null,
        unit_of_measure: productForm.unit_of_measure,
        sale_price: Number(productForm.sale_price),
        tax_rate: Number(productForm.tax_rate || 0),
        low_stock_threshold: Number(productForm.low_stock_threshold || 0),
        is_active: productForm.is_active,
      }

      if (editingProduct) {
        const updated = await apiFetch<Product>(`/inventory/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: payload.name,
            description: payload.description,
            hsn_sac_code: payload.hsn_sac_code,
            unit_of_measure: payload.unit_of_measure,
            sale_price: payload.sale_price,
            tax_rate: payload.tax_rate,
            is_active: payload.is_active,
          }),
        })

        setProducts((current) =>
          current.map((product) => (product.id === updated.id ? updated : product))
        )
        toast.success("Product updated")
      } else {
        const created = await apiFetch<Product>("/inventory/products", {
          method: "POST",
          body: JSON.stringify(payload),
        })

        setProducts((current) => [created, ...current])
        const stock = await apiFetch<StockBalance>(`/inventory/stock/${created.id}`)
        setStockByProduct((current) => ({ ...current, [created.id]: stock }))
        toast.success("Product created")
      }

      setFormOpen(false)
      setEditingProduct(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStockAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stockProduct || !stockQuantity || Number(stockQuantity) < 0) {
      toast.error("Enter a valid quantity")
      return
    }

    try {
      setSaving(true)
      const balance = await apiFetch<StockBalance>("/inventory/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          product_id: stockProduct.id,
          quantity: Number(stockQuantity),
          movement_type: stockMovement,
          reason: stockReason || null,
          reference_type: "MANUAL",
          reference_id: null,
        }),
      })

      setStockByProduct((current) => ({ ...current, [stockProduct.id]: balance }))
      setStockOpen(false)
      toast.success("Stock updated")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#12141a]">Inventory</h1>
          <p className="text-sm text-[#6b707d]">
            Product catalog, SKU pricing, and stock visibility.
          </p>
        </div>
        <Button className="h-9 rounded-md" onClick={openCreateProduct}>
          <PackagePlus className="size-4" />
          New product
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Total SKUs" value={metrics.totalSkus} />
        <Metric label="Active products" value={metrics.activeProducts} />
        <Metric label="Low stock" value={metrics.lowStock} tone={metrics.lowStock > 0 ? "warn" : "ok"} />
      </div>

      <div className="rounded-lg border border-[#e0e4eb] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#e0e4eb] p-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b707d]" />
            <Input
              className="h-9 rounded-md pl-9"
              placeholder="Search product, SKU, or HSN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button
            variant={activeOnly ? "default" : "outline"}
            className="h-9 rounded-md"
            onClick={() => setActiveOnly((value) => !value)}
          >
            <SlidersHorizontal className="size-4" />
            Active only
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>HSN/SAC</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-[#6b707d]" />
                </TableCell>
              </TableRow>
            )}

            {!loading && filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-[#6b707d]">
                  No products found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              filteredProducts.map((product) => {
                const stock = stockByProduct[product.id]
                const stockQuantity = stock ? quantity(stock.quantity_on_hand) : "-"
                const isLow =
                  stock &&
                  Number(stock.quantity_on_hand) <= Number(stock.low_stock_threshold)

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium text-[#12141a]">{product.name}</div>
                      <div className="max-w-[280px] truncate text-xs text-[#6b707d]">
                        {product.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell>{product.hsn_sac_code || "-"}</TableCell>
                    <TableCell>{product.unit_of_measure}</TableCell>
                    <TableCell>{money(product.sale_price)}</TableCell>
                    <TableCell>{Number(product.tax_rate || 0).toFixed(2)}%</TableCell>
                    <TableCell>
                      <span className={isLow ? "font-medium text-amber-700" : undefined}>
                        {stockQuantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          product.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openStockAdjustment(product)}>
                          <RotateCw className="size-3.5" />
                          Stock
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditProduct(product)}>
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSaveProduct}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name">
                <Input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label="SKU">
                <Input disabled={!!editingProduct} value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} />
              </Field>
              <Field label="HSN/SAC">
                <Input value={productForm.hsn_sac_code} onChange={(event) => setProductForm((current) => ({ ...current, hsn_sac_code: event.target.value }))} />
              </Field>
              <Field label="Unit">
                <Input value={productForm.unit_of_measure} onChange={(event) => setProductForm((current) => ({ ...current, unit_of_measure: event.target.value }))} />
              </Field>
              <Field label="Sale price">
                <Input type="number" min="0" step="0.01" value={productForm.sale_price} onChange={(event) => setProductForm((current) => ({ ...current, sale_price: event.target.value }))} />
              </Field>
              <Field label="Tax rate">
                <Input type="number" min="0" max="100" step="0.01" value={productForm.tax_rate} onChange={(event) => setProductForm((current) => ({ ...current, tax_rate: event.target.value }))} />
              </Field>
              {!editingProduct && (
                <Field label="Low stock threshold">
                  <Input type="number" min="0" step="0.01" value={productForm.low_stock_threshold} onChange={(event) => setProductForm((current) => ({ ...current, low_stock_threshold: event.target.value }))} />
                </Field>
              )}
              {editingProduct && (
                <Field label="Status">
                  <Select
                    value={productForm.is_active ? "active" : "inactive"}
                    onValueChange={(value) => setProductForm((current) => ({ ...current, is_active: value === "active" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
            <Field label="Description">
              <Input value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleStockAdjustment}>
            <div className="rounded-md border border-[#e0e4eb] bg-[#f8f9fa] p-3">
              <div className="font-medium">{stockProduct?.name}</div>
              <div className="text-sm text-[#6b707d]">
                Current stock: {stockProduct ? quantity(stockByProduct[stockProduct.id]?.quantity_on_hand || 0) : "-"}
              </div>
            </div>
            <Field label="Movement">
              <Select value={stockMovement} onValueChange={setStockMovement}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock in</SelectItem>
                  <SelectItem value="OUT">Stock out</SelectItem>
                  <SelectItem value="ADJUSTMENT">Set quantity</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quantity">
              <Input type="number" min="0" step="0.01" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} />
            </Field>
            <Field label="Reason">
              <Input value={stockReason} onChange={(event) => setStockReason(event.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStockOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Updating..." : "Update stock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium text-[#636973]">{label}</Label>
      {children}
    </div>
  )
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: "neutral" | "ok" | "warn"
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-[#12141a]"

  return (
    <div className="rounded-lg border border-[#e0e4eb] bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-normal text-[#6b707d]">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}
