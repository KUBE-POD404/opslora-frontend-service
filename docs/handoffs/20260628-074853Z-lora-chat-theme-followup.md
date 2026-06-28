# Lora chat full-screen UI and theme follow-up

Timestamp: 20260628-074853Z
Repo: opslora-frontend-service
Branch: fix/lora-chat-fullscreen-theme

## Why

The Lora AI page still showed implementation guidance text such as Hermes/ChatGPT-style wording, kept prompt suggestions in the UI, left sent text in the composer in some flows, and did not feel like a full-screen assistant. Settings/profile theme colors also regressed because the dashboard layout hard-coded dark mode and global CSS forced light utility classes into dark token colors.

## What changed

- Reworked `/lora-ai` into a full-height assistant surface.
- Removed literal Hermes/ChatGPT copy and removed prompt suggestion chips.
- Composer prompt now says `lora`, not `hermes$`.
- Composer clears immediately after sending.
- Added local conversation history sidebar with new-chat and session switching.
- Added provider selector in the top-left header.
- Added `/briefing` slash command support for live operations briefing flow.
- Continued to forward the browser bearer token to Lora AI calls so backend live tenant context can call Opslora services with caller authorization.
- Added shared shadcn-style `Switch` component using Radix Switch.
- Replaced custom toggle buttons in organization/profile settings with the shared Switch.
- Removed dashboard-level hard-coded `dark` class so the top nav theme toggle works again.
- Removed global `.ops-dashboard` CSS overrides that were forcing text/background colors and breaking light theme/profile settings.

## Files changed

- `app/(dashboard)/lora-ai/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/settings/_components/organization-settings-client.tsx`
- `app/(dashboard)/settings/profile/page.tsx`
- `app/globals.css`
- `components/ui/switch.tsx`
- `package.json`
- `package-lock.json`

## Validation

From `/tmp/opslora-frontend-lora-followup`:

```text
npm run lint
# exit 0; only pre-existing next/no-img-element warnings in app/page.tsx and components/app-sidebar.tsx

npm run build
# exit 0; /lora-ai, /settings, /settings/profile and all dashboard routes built successfully
```

Static grep confirmed the Lora page no longer contains:

- `Hermes`
- `ChatGPT`
- `Hermes CLI`
- `ChatGPT-style`
- `hermes$`
- `Ask Lora what needs attention`

## Notes

Conversation history is local browser state for now, matching the requested ChatGPT-style experience without adding a new persistence API. If server-side chat history is needed later, add a conversation listing endpoint in Lora AI service and hydrate this sidebar from it.
