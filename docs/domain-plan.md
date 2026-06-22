# app.opslora.com Plan

This repository is the authenticated SaaS application for `app.opslora.com`.

## Role

- Authenticated product UI
- Dashboard
- Customers
- Inventory
- Orders
- Invoices
- Payments
- Settings

## Routing

- Public marketing belongs to `opslora.com`
- Documentation belongs to `docs.opslora.com`
- Application dashboard starts at `/dashboard`
- Auth routes remain under `/auth/login` and `/auth/signup`

## Deployment Target

Primary target: Azure AKS behind ingress/application routing.

Suggested DNS:

- `app.opslora.com` -> Azure Front Door or Application Gateway public endpoint
- App service routes remain relative, for example `/api/v1/...`

## Container Strategy

- Continue using GitHub Actions and GHCR for application images.
- AKS pulls from GHCR using image pull secret or workload identity-compatible flow.
