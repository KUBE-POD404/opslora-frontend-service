# Opslora app UI cleanup and Lora chat refresh

Date: 2026-06-28 07:09:44Z

## Why

The authenticated app had too much top-page marketing/helper copy on the day-to-day workflow pages and several settings surfaces had theme mismatches in dark mode. The Lora AI page also led with consent/opt-in messaging instead of feeling like a direct assistant surface.

The requested product direction was:

- Remove the big top content blocks from Customers, Inventory, Orders, Invoices, and Payments.
- Keep Lora AI as a dedicated page, but make it feel closer to a Hermes CLI plus ChatGPT-style interface.
- Remove the "Opt in before Lora AI..." hero from the top of the Lora AI page.
- Remove the "Current subpage is selected in the sidebar..." settings notice.
- Fix dark/light theme text color mismatches in settings/profile-style surfaces.
- Fix toggle colors so enabled/disabled states match the dark Opslora theme.

## Changed files

- `components/operations/page-chrome.tsx`
  - Added `showHero?: boolean` to the shared operations page wrapper.
  - When `showHero={false}`, the large hero/title/description block is not rendered.
  - Primary action buttons still render as a compact top-right action row.

- `app/(dashboard)/customers/page.tsx`
- `app/(dashboard)/inventory/page.tsx`
- `app/(dashboard)/orders/page.tsx`
- `app/(dashboard)/invoices/page.tsx`
- `app/(dashboard)/payments/page.tsx`
  - Set `showHero={false}` so the workflow pages now start with metrics/tables/actions instead of large hero copy.

- `app/(dashboard)/lora-ai/page.tsx`
  - Replaced the old top hero/consent-first layout with a chat-first terminal surface.
  - Header now reads `Lora AI terminal` and uses a small status indicator.
  - Main pane is a ChatGPT-style conversation area with assistant messages using a subtle monospace/Hermes CLI feel.
  - Input now uses a `hermes$` prompt line.
  - Consent gating remains enforced, but appears as an in-chat locked state instead of a dominant top-page hero.
  - Provider status and live operations briefing moved into a compact right-side rail.

- `app/(dashboard)/settings/_components/organization-settings-client.tsx`
  - Removed the repeated "Current subpage is selected..." notice.
  - Updated headings, labels, panel text, inputs, buttons, Lora consent box, and helper copy to use dark-theme-compatible colors.
  - Updated toggles from light gray/dark black to theme-matching `bg-white/15` disabled and Opslora indigo enabled.

- `components/app-sidebar.tsx`
  - Removed the separate `Lora AI consent` settings sidebar entry to reduce sidebar clutter.
  - The route still exists for deep links; it is just no longer repeated in the sidebar.

## Verification run locally

From `/tmp/opslora-frontend-ui-cleanup`:

```text
npm ci
npm run lint
npm run test:settings-ui
npm run build
```

Results:

```text
npm run lint: passed with two existing no-img-element warnings in app/page.tsx and components/app-sidebar.tsx
npm run test:settings-ui: settings UI static contract ok
npm run build: compiled successfully, TypeScript finished successfully, 23/23 static pages generated
```

Local HTTP smoke against the built app on port 3100:

```text
/customers         http=200
/inventory         http=200
/orders            http=200
/invoices          http=200
/payments          http=200
/lora-ai           http=200
/settings          http=200
/settings/profile  http=200
```

Browser note: authenticated app routes redirect to login without a local session, so local visual smoke could only confirm route health/login redirect. Runtime visual review should be done on Azure test after the frontend image is deployed.

## Deployment path

Use the normal frontend GitHub PR path:

1. Open PR from `fix/app-ui-cleanup-lora-chat` to `main`.
2. Add the `build` label after local checks are green.
3. Watch PR checks.
4. After GitHub approval, merge and let the frontend post-merge image workflow build/push to test ACR and update Helm test values.
5. Let Argo reconcile `frontend-service-azure-test`.
6. Verify `https://app-test.opslora.com/customers`, `/inventory`, `/orders`, `/invoices`, `/payments`, `/lora-ai`, `/settings`, and `/settings/profile` before prod promotion.

## Prod promotion note

Do not promote this UI to prod until the Azure test deployment has been visually reviewed and the user confirms the cleaned workflow pages, Lora AI chat surface, settings colors, and toggle colors look right.
