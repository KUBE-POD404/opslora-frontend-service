# Theme tokenization, table readability, and Lora slash commands

Timestamp: 20260628-093246Z
Repo: opslora-frontend-service
Branch: fix/theme-table-lora-slash

## Why

User reported that table identifiers such as order ID, invoice ID, customer name, and payment ID were black in dark mode and hard to read. The light/dark toggle was changing the side nav, top nav, and buttons, but not the main page surfaces/text. User also wanted Lora to show available `/` commands like Hermes does, starting with Live briefing.

## Root cause

Several dashboard pages and the shared operations page chrome used hard-coded dark UI colors:

- `bg-[#070b16]`, `text-[#f7f8fb]`, `bg-white/[...]`, `border-white/10`
- table primary text like `text-[#12141a]`
- muted text like `text-[#6b707d]` / `text-[#8790a0]`

Those classes ignored the app's CSS theme variables, so page content did not switch with the same theme system used by the side/top nav.

## Changes

### Theme and table readability

- Reworked `components/operations/page-chrome.tsx` to use app theme tokens:
  - `bg-background`
  - `text-foreground`
  - `bg-card`
  - `text-card-foreground`
  - `text-muted-foreground`
  - `border-border`
- Swept dashboard routes to replace hard-coded invisible table/page text with theme tokens.
- Fixed table IDs/names and details on:
  - customers
  - orders
  - inventory
  - invoices
  - invoice details
  - invoice payment page
  - payments
  - order-to-invoice page
  - dashboard
  - reports
  - settings/profile
  - invoice templates shell
- Kept invoice-template preview paper colors where they represent the generated invoice design itself, not the app shell.

### Lora slash commands

- Added a slash command menu on `/lora-ai`.
- Typing `/` opens a small command palette above the composer.
- Current command:
  - `/briefing` — Live briefing: pulls live Opslora data and asks Lora for the operations briefing.
- Pressing Enter on `/` runs the first suggested command.
- Clicking the command runs it directly.

## Validation

Commands run from `/tmp/opslora-frontend-theme-slash`:

```bash
npm run lint
npm run build
```

Results:

- Lint passed with only pre-existing Next `<img>` warnings in:
  - `app/page.tsx`
  - `components/app-sidebar.tsx`
- Build passed.

Hard-coded invisible color search:

- No matches remained for the old problematic table/page classes:
  - `text-[#12141a]`
  - `text-[#6b707d]`
  - `text-[#8790a0]`
  - `text-[#9aa4b2]`
  - `text-[#f7f8fb]`
  - `bg-[#070b16]`
  - `bg-white/[...]`
  - `border-white/10`

Local production route smoke:

```text
/customers http=200 bytes=13905
/orders http=200 bytes=13899
/invoices http=200 bytes=13903
/payments http=200 bytes=13903
/inventory http=200 bytes=13905
/reports http=200 bytes=14150
/dashboard http=200 bytes=13905
/lora-ai http=200 bytes=13665
/settings/profile http=200 bytes=14155
/settings/invoice-templates http=200 bytes=14175
/orders/1/create-invoice http=200 bytes=14572
/invoices/1 http=200 bytes=13825
/invoices/1/pay http=200 bytes=14541
```

## Notes

This pass focuses on app-shell/theme tokenization and Lora command discoverability. It does not redesign the invoice template paper preview colors because those are intentionally part of the rendered invoice aesthetic.
