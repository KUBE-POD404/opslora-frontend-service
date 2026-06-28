# Lora UI test build trigger

Timestamp: 20260628-081200Z

This no-op documentation change exists to trigger the approved Opslora frontend test image pipeline after PR #25 merged without the `build` label.

The application code being deployed is already on `main` via PR #25:

- Full-screen Lora chat UI
- Lora branding and cleared composer
- Provider selector and conversation history
- shadcn/Radix toggles
- restored light/dark theme behavior

Deploy path should remain GitHub CI -> ACR -> Helm test values -> ArgoCD.
