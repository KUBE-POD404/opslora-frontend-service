export type DownloadableInvoiceLine = {
  id: number
  sku?: string | null
  product_name: string
  hsn_sac_code?: string | null
  unit_of_measure?: string | null
  quantity: number
  unit_price: number
  tax_rate: number
  taxable_value: number
  tax_amount: number
  line_total: number
}

export type DownloadableInvoiceTaxSummary = {
  tax_component: string
  tax_rate: number
  taxable_value: number
  tax_amount: number
}

export type DownloadableInvoice = {
  id: number
  invoice_number?: string | null
  invoice_template_key?: string | null
  order_id: number
  customer_id?: number | null
  customer_name?: string | null
  customer_email?: string | null
  customer_gstin?: string | null
  customer_place_of_supply?: string | null
  seller_legal_name?: string | null
  seller_display_name?: string | null
  seller_email?: string | null
  seller_phone?: string | null
  seller_tax_id?: string | null
  seller_address?: string | null
  seller_country?: string | null
  seller_state?: string | null
  invoice_terms?: string | null
  invoice_footer?: string | null
  round_off_enabled: boolean
  subtotal: number
  tax: number
  total: number
  due_date: string
  status: string
  discount_type?: string | null
  discount_value: number
  created_at: string
  lines: DownloadableInvoiceLine[]
  tax_summary: DownloadableInvoiceTaxSummary[]
}

export type DownloadablePayment = {
  id: number
  invoice_id: number
  amount: number
  currency: string
  payment_method: string
  payment_type: string
  status: string
  reference_number?: string | null
  gateway_provider?: string | null
  paid_at: string
  note?: string | null
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function money(value: number, currency = "INR") {
  const prefix = currency === "INR" ? "Rs" : currency
  return `${prefix} ${Number(value || 0).toFixed(2)}`
}

function date(value: string | null | undefined) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function safeFileSegment(value: string) {
  return Array.from(value)
    .map((char) => {
      const lower = char.toLowerCase()
      const isLetter = lower >= "a" && lower <= "z"
      const isNumber = char >= "0" && char <= "9"
      return isLetter || isNumber || char === "-" || char === "_" ? char : "-"
    })
    .join("")
    .split("-")
    .filter(Boolean)
    .join("-")
    .slice(0, 80)
}

function formatAddress(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).map((part) => escapeHtml(part)).join("<br />") || "-"
}

function paidAmount(payments: DownloadablePayment[]) {
  return payments
    .filter((payment) => payment.status !== "REFUNDED")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
}

function lineRows(invoice: DownloadableInvoice) {
  if (invoice.lines.length === 0) {
    return `<tr><td colspan="7" class="empty">No invoice lines found.</td></tr>`
  }

  return invoice.lines
    .map((line) => {
      const productMeta = [line.sku, line.unit_of_measure].filter(Boolean).join(" · ")
      return `<tr>
        <td>
          <strong>${escapeHtml(line.product_name)}</strong>
          ${productMeta ? `<span>${escapeHtml(productMeta)}</span>` : ""}
        </td>
        <td>${escapeHtml(line.hsn_sac_code || "-")}</td>
        <td class="num">${Number(line.quantity || 0).toFixed(2)}</td>
        <td class="num">${money(line.unit_price)}</td>
        <td class="num">${money(line.taxable_value)}</td>
        <td class="num">${money(line.tax_amount)}<span>${Number(line.tax_rate || 0).toFixed(2)}%</span></td>
        <td class="num strong">${money(line.line_total)}</td>
      </tr>`
    })
    .join("")
}

function taxRows(invoice: DownloadableInvoice) {
  if (invoice.tax_summary.length === 0) {
    return `<tr><td colspan="4" class="empty">No tax summary available.</td></tr>`
  }

  return invoice.tax_summary
    .map((tax) => `<tr>
      <td>${escapeHtml(tax.tax_component)}</td>
      <td class="num">${Number(tax.tax_rate || 0).toFixed(2)}%</td>
      <td class="num">${money(tax.taxable_value)}</td>
      <td class="num strong">${money(tax.tax_amount)}</td>
    </tr>`)
    .join("")
}

function paymentRows(payments: DownloadablePayment[]) {
  if (payments.length === 0) {
    return `<tr><td colspan="5" class="empty">No payments recorded.</td></tr>`
  }

  return payments
    .map((payment) => `<tr>
      <td>${date(payment.paid_at)}</td>
      <td>${escapeHtml(payment.payment_method.replaceAll("_", " "))}</td>
      <td>${escapeHtml(payment.reference_number || payment.gateway_provider || "-")}</td>
      <td>${escapeHtml(payment.status)}</td>
      <td class="num strong">${money(payment.amount, payment.currency)}</td>
    </tr>`)
    .join("")
}

export function buildInvoiceDownloadHtml(invoice: DownloadableInvoice, payments: DownloadablePayment[]) {
  const invoiceLabel = invoice.invoice_number || `INV-${invoice.id}`
  const sellerName = invoice.seller_display_name || invoice.seller_legal_name || "Seller"
  const amountPaid = paidAmount(payments)
  const balanceDue = Math.max(Number(invoice.total || 0) - amountPaid, 0)
  const discountLabel = invoice.discount_type ? `Discount (${invoice.discount_type})` : "Discount"
  const showDiscount = invoice.discount_type || Number(invoice.discount_value || 0) > 0
  const templateName = invoice.invoice_template_key || "opslora_default"

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(invoiceLabel)} invoice</title>
  <style>
    :root { color-scheme: light; --accent: #06b6d4; --accent-2: #2563eb; --ink: #141821; --muted: #6f6a5d; --paper: #f8f5ec; --line: #d8d2c3; --soft: #fffdf6; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #edf1f5; color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .page { width: min(1040px, calc(100vw - 32px)); margin: 32px auto; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; color: #475569; font-size: 13px; }
    .toolbar strong { color: #0f172a; }
    .toolbar button { border: 1px solid #cbd5e1; border-radius: 999px; background: white; color: #0f172a; cursor: pointer; font: inherit; padding: 8px 14px; }
    .invoice-shell { overflow: hidden; border: 1px solid var(--line); border-radius: 20px; background: var(--paper); box-shadow: 0 24px 80px rgba(15,23,42,.16); }
    .invoice-shell::before { content: ""; display: block; height: 8px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); }
    .invoice-header, .parties, .footer-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 28px; padding: 34px; }
    .invoice-header { border-bottom: 1px solid var(--line); }
    .eyebrow { display: inline-flex; border-radius: 999px; background: #0e2630; color: #cffafe; padding: 6px 12px; font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 18px 0 4px; font-size: clamp(34px, 8vw, 58px); letter-spacing: -.06em; line-height: .92; }
    h2 { margin: 0 0 12px; font-size: 18px; }
    p { margin: 0; color: var(--muted); line-height: 1.6; }
    .invoice-meta { text-align: right; display: grid; align-content: start; gap: 6px; color: var(--muted); }
    .invoice-meta strong, .parties strong { color: var(--ink); }
    .status-pill { justify-self: end; display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; color: var(--ink); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .parties span, .section-label { display: block; margin-bottom: 8px; color: #8a7d65; font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    .table-wrap { margin: 0 34px 26px; overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; }
    table { width: 100%; min-width: 760px; border-collapse: separate; border-spacing: 0; }
    th, td { padding: 14px 16px; text-align: left; border-top: 1px solid var(--line); vertical-align: top; }
    thead th { border-top: 0; background: #eee7d7; color: var(--muted); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; }
    td span { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; }
    .num { text-align: right; white-space: nowrap; }
    .strong { font-weight: 800; color: var(--ink); }
    .empty { color: var(--muted); text-align: center; }
    .card { border: 1px solid var(--line); border-radius: 14px; background: var(--soft); padding: 18px; }
    .totals { display: grid; gap: 10px; }
    .total-row { display: flex; justify-content: space-between; gap: 16px; color: var(--muted); }
    .total-row.grand { border-top: 1px solid var(--line); color: var(--ink); font-size: 22px; font-weight: 850; padding-top: 14px; }
    .notes { margin: 0 34px 34px; display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .payments { margin-top: 24px; }
    @media (max-width: 760px) { .page { width: min(100%, calc(100vw - 16px)); margin: 8px auto; } .invoice-header, .parties, .footer-grid { grid-template-columns: 1fr; padding: 22px; } .invoice-meta { text-align: left; } .status-pill { justify-self: start; } .table-wrap, .notes { margin-left: 22px; margin-right: 22px; } .notes { grid-template-columns: 1fr; } }
    @media print { body { background: white; } .page { width: 100%; margin: 0; } .toolbar { display: none; } .invoice-shell { box-shadow: none; border-radius: 0; border: 0; } .table-wrap { overflow: visible; } }
  </style>
</head>
<body>
  <main class="page">
    <div class="toolbar">
      <strong>${escapeHtml(invoiceLabel)} · Opslora default invoice</strong>
      <span>Generated from live invoice #${escapeHtml(invoice.id)} using template ${escapeHtml(templateName)}</span>
      <button onclick="window.print()">Print / save as PDF</button>
    </div>
    <section class="invoice-shell">
      <header class="invoice-header">
        <div>
          <div class="eyebrow">Opslora</div>
          <h1>Invoice</h1>
          <p>Professional GST-ready invoice generated from the selected invoice record.</p>
        </div>
        <div class="invoice-meta">
          <strong>Invoice #${escapeHtml(invoiceLabel)}</strong>
          <span>Order #${escapeHtml(invoice.order_id)}</span>
          <span>Issued ${date(invoice.created_at)}</span>
          <span>Due ${date(invoice.due_date)}</span>
          <span class="status-pill">${escapeHtml(invoice.status)}</span>
        </div>
      </header>

      <div class="parties">
        <div>
          <span>From</span>
          <strong>${escapeHtml(sellerName)}</strong>
          <p>${formatAddress(invoice.seller_legal_name, invoice.seller_tax_id ? `GSTIN ${invoice.seller_tax_id}` : null, invoice.seller_address, invoice.seller_state, invoice.seller_country, invoice.seller_email, invoice.seller_phone)}</p>
        </div>
        <div>
          <span>Bill to</span>
          <strong>${escapeHtml(invoice.customer_name || "Customer")}</strong>
          <p>${formatAddress(invoice.customer_email, invoice.customer_gstin ? `GSTIN ${invoice.customer_gstin}` : null, invoice.customer_place_of_supply)}</p>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>HSN/SAC</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Taxable</th><th class="num">Tax</th><th class="num">Total</th></tr></thead>
          <tbody>${lineRows(invoice)}</tbody>
        </table>
      </div>

      <div class="footer-grid">
        <div class="card">
          <span class="section-label">Tax summary</span>
          <table>
            <thead><tr><th>Component</th><th class="num">Rate</th><th class="num">Taxable</th><th class="num">Tax</th></tr></thead>
            <tbody>${taxRows(invoice)}</tbody>
          </table>
        </div>
        <div class="card totals">
          <div class="total-row"><span>Subtotal</span><strong>${money(invoice.subtotal)}</strong></div>
          <div class="total-row"><span>Tax</span><strong>${money(invoice.tax)}</strong></div>
          ${showDiscount ? `<div class="total-row"><span>${escapeHtml(discountLabel)}</span><strong>-${money(invoice.discount_value)}</strong></div>` : ""}
          <div class="total-row grand"><span>Total</span><span>${money(invoice.total)}</span></div>
          <div class="total-row"><span>Paid</span><strong>${money(amountPaid)}</strong></div>
          <div class="total-row"><span>Balance due</span><strong>${money(balanceDue)}</strong></div>
        </div>
      </div>

      <div class="notes">
        <div class="card">
          <span class="section-label">Terms</span>
          <p>${escapeHtml(invoice.invoice_terms || "Payment accepted by bank transfer, UPI, or card.")}</p>
        </div>
        <div class="card">
          <span class="section-label">Footer</span>
          <p>${escapeHtml(invoice.invoice_footer || "Thank you for your business.")}</p>
        </div>
      </div>

      <div class="notes payments">
        <div class="card" style="grid-column: 1 / -1;">
          <span class="section-label">Payment transactions</span>
          <table>
            <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Status</th><th class="num">Amount</th></tr></thead>
            <tbody>${paymentRows(payments)}</tbody>
          </table>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`
}

export function downloadInvoiceHtml(invoice: DownloadableInvoice, payments: DownloadablePayment[]) {
  const invoiceLabel = invoice.invoice_number || `INV-${invoice.id}`
  const blob = new Blob([buildInvoiceDownloadHtml(invoice, payments)], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${safeFileSegment(invoiceLabel)}-opslora-invoice.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
