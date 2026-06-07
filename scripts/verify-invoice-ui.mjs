import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const detailPath = join(process.cwd(), "app/(dashboard)/invoices/[id]/page.tsx")
const listPath = join(process.cwd(), "app/(dashboard)/invoices/page.tsx")
const detail = readFileSync(detailPath, "utf8")
const list = readFileSync(listPath, "utf8")

function includes(source, needle, label = needle) {
  assert.ok(source.includes(needle), `Expected invoice UI to include ${label}`)
}

includes(detail, "seller_legal_name")
includes(detail, "seller_tax_id")
includes(detail, "invoice_terms")
includes(detail, "invoice_footer")
includes(detail, "tax_summary")
includes(detail, "Payment status")
includes(detail, "Download / print")
includes(detail, "Tax summary")
includes(detail, "Seller")
includes(detail, "Bill to")
includes(detail, "apiFetch<Invoice>(`/invoices/${id}`)")
includes(detail, "apiFetch<Payment[]>")
includes(list, "invoice_number")
includes(list, "Customer")
includes(list, "Status")

console.log("invoice UI static contract ok")
