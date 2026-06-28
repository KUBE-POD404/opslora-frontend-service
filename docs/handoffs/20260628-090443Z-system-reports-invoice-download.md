# System nav, reports, invoice template download, and animation pass

Timestamp: 20260628-090443Z
Repo: opslora-frontend-service
Branch: fix/system-reports-invoice-download

## Why

User feedback after the Lora UI/live-context rollout:

- Invoice templates were grouped under a sidebar label named `Projects`; this should be `System`.
- The sidebar group had 3-dot project actions (`View Project`, `Share Project`, `Delete Project`) that do not belong there.
- Reports was just linked to the Dashboard page; it needed a distinct reports page.
- Lora needed a response animation while composing.
- Sidebar collapse needed smoother animation.
- Invoice template preview collapsed/overflowed badly in the view dialog.
- Invoice template download needed live download logic.

## Changes

### Navigation

- Reworked `components/nav-projects.tsx` into a simple System navigation group.
- Removed the dropdown/three-dot actions entirely.
- Updated `components/app-sidebar.tsx` so Reports points to `/reports` instead of `/dashboard`.

### Reports

- Added `app/(dashboard)/reports/page.tsx`.
- Uses live tenant API data from invoices/orders/payments/products/stock.
- Adds separate reports layout with:
  - collections trend area chart,
  - invoice status donut chart,
  - order activity bar chart,
  - top customers by invoice value,
  - receivables/inventory/reporting notes.

### Lora and sidebar animation

- Added Framer Motion animation to Lora history panel opening/closing.
- Added animated chat bubbles.
- Replaced the plain spinner with a composing animation while Lora responds.
- Smoothed sidebar width/container/menu transitions in `components/ui/sidebar.tsx`.

### Invoice templates

- Added `Download` actions for template cards and the view dialog.
- Download generates a live HTML invoice template file from the selected template metadata and current sample layout styling.
- Dialog now uses a responsive width and horizontally scrollable preview instead of collapsing content.

## Validation

Commands run from `/tmp/opslora-frontend-system-reports`:

```bash
npm run lint
npm run build
```

Results:

- Lint passed with two pre-existing Next `<img>` warnings in `app/page.tsx` and `components/app-sidebar.tsx`.
- Build passed and generated `/reports` successfully.

Local production route smoke:

```text
/reports http=200 bytes=14150
/settings/invoice-templates http=200 bytes=14175
/lora-ai http=200 bytes=13665
/settings http=200 bytes=13273
/dashboard http=200 bytes=13905
```

## Notes

The invoice template download currently generates a standalone printable HTML file in the browser. The invoice service does not yet expose a backend PDF/download endpoint. This keeps the feature usable now and preserves tenant-scoped frontend behavior without inventing an unavailable backend route.
