# Frontend backend-backed invoice PDF download

Timestamp: 20260628-103904Z
Repo: opslora-frontend-service
Branch: feat/backend-invoice-pdf-download

## Why

User reported the current invoice download/print output is over-spaced and cuts invoice content. Backend PDF generation is being added in invoice-service, so the frontend should call that endpoint instead of relying only on browser-generated HTML.

## Changes

- Added `downloadApiBlob(path, fallbackFilename)` in `lib/api.ts`:
  - uses stored bearer token
  - refreshes access token on 401 like `apiFetch`
  - parses `Content-Disposition` filename when present
  - downloads the returned Blob directly
- Updated `/invoices/[id]` Download action:
  - label changed to `Download PDF`
  - calls `/api/v1/invoices/{id}/download`
  - shows spinner while downloading
  - keeps existing HTML download as fallback if backend PDF route is unavailable
- Updated `scripts/verify-invoice-ui.mjs` contract for backend PDF download and fallback.

## Validation

From `/tmp/opslora-frontend-backend-pdf`:

```bash
npm install
node scripts/verify-invoice-ui.mjs
npm run lint
npm run build
```

Result:

- static contract passed
- lint passed with only pre-existing `<img>` warnings
- build passed

Local production smoke:

```text
/invoices http=200 bytes=13903
/invoices/2 http=200 bytes=13825
/invoices/2/pay http=200 bytes=14541
/settings/invoice-templates http=200 bytes=14175
```

## Runtime verification after deploy

After invoice-service and frontend-service are both deployed:

1. Open `https://app-test.opslora.com/invoices/2`.
2. Click `Download PDF`.
3. Confirm downloaded file is `INV-000001-000002-opslora-invoice.pdf` or equivalent invoice-number filename.
4. Confirm PDF includes order/customer/product/tax/total and does not cut content.
