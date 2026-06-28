# Live invoice download from invoice detail

Timestamp: 20260628-095340Z
Repo: opslora-frontend-service
Branch: feat/live-invoice-download

## Why

User asked for the Download action on an invoice detail page such as `/invoices/2` to download that invoice's actual content using the Opslora default invoice template.

## Root cause / current state

The invoice detail page already fetched the live invoice payload from `/invoices/:id` and payment data from `/payments/invoice/:id`, but the Download button was disabled with the placeholder title `PDF export will be wired after print layout is finalized`.

The invoice service currently exposes invoice JSON and template metadata, but not a backend PDF endpoint. To avoid inventing a missing route, this pass implements a browser-side downloadable printable HTML invoice using the live invoice data.

## Changes

- Added `lib/invoice-download.ts`.
- Added `buildInvoiceDownloadHtml(invoice, payments)`:
  - injects the selected invoice's live values into the Opslora default invoice design
  - includes seller details
  - includes customer/bill-to details
  - includes invoice number, order id, status, issue date, due date
  - includes live invoice line items, quantities, tax, taxable amount, and totals
  - includes tax summary
  - includes terms/footer
  - includes payment transactions
  - includes paid amount and balance due
  - escapes all injected text before putting it into HTML
  - includes a print/save-as-PDF button inside the downloaded document
- Added `downloadInvoiceHtml(invoice, payments)`:
  - creates a `text/html;charset=utf-8` Blob
  - downloads `${invoiceLabel}-opslora-invoice.html`
- Wired `/invoices/[id]` Download button:
  - no longer disabled
  - label changed to `Download invoice`
  - downloads the current invoice content with payment context
- Updated `scripts/verify-invoice-ui.mjs` static contract for the live download behavior.

## Validation

Commands run from `/tmp/opslora-frontend-invoice-download`:

```bash
npm run lint
npm run build
node scripts/verify-invoice-ui.mjs
```

Results:

- Lint passed with only pre-existing Next `<img>` warnings in:
  - `app/page.tsx`
  - `components/app-sidebar.tsx`
- Build passed.
- Static invoice UI contract passed.

Local production smoke:

```text
/invoices http=200 bytes=13903
/invoices/2 http=200 bytes=13825
/invoices/2/pay http=200 bytes=14541
/settings/invoice-templates http=200 bytes=14175
```

## Notes

This produces a downloadable printable HTML invoice. Users can open it and use the embedded `Print / save as PDF` button to produce a PDF. A future backend PDF endpoint can replace the browser-side HTML download without changing the invoice detail UX.
