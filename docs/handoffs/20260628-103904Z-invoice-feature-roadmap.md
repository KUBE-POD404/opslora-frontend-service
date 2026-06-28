# Invoice feature roadmap requested after backend PDF

Timestamp: 20260628-103904Z

User asked to continue with all invoice improvements mentioned earlier. This file tracks the next slices so they can be implemented cleanly after backend PDF download lands.

## Slice 1 — backend PDF download

Status: in progress in current work.

- invoice-service: `GET /api/v1/invoices/{id}/download`
- frontend: `Download PDF` calls backend route
- Helm test config: invoice-service gets `PAYMENT_SERVICE_URL`

## Slice 2 — invoice email/share flow

Target behavior:

- Add `Send invoice` button on invoice detail.
- Backend endpoint: `POST /api/v1/invoices/{id}/send`.
- Notification-service email sends customer a professional branded invoice email with either:
  - attached backend-generated PDF, or
  - secure invoice link first, attachment later if email-size/infra constraints require it.
- Track sent state:
  - `sent_at`
  - `sent_to_email`
  - `last_sent_by_user_id`
- UI shows last sent timestamp and allows resend.

Test requirements:

- tenant-scoped send permission
- no send for cancelled/refunded invoice unless explicitly allowed
- notification payload contains invoice id, invoice number, customer email, total, due date
- email content escapes all dynamic fields

## Slice 3 — invoice lifecycle/status workflow

Target statuses:

- Draft
- Sent
- Viewed
- Partially Paid
- Paid
- Overdue
- Cancelled
- Refunded

Current statuses already include much of this at model level, but lifecycle needs product rules and UI.

Backend tasks:

- Add `SENT` and possibly `DRAFT` if not already in schema/model migration.
- Add status transition validation.
- Add endpoint to mark sent/viewed.
- Add overdue job or read-time overdue computation.

Frontend tasks:

- status timeline card
- primary action changes by status
- filters for Sent/Overdue/Partially Paid

## Slice 4 — overdue reminders

Target behavior:

- Detect invoices past due date with unpaid balance.
- Add reminder action from invoice detail and overdue list.
- Optional scheduled reminder job later.

Backend tasks:

- `POST /api/v1/invoices/{id}/remind`
- Notification-service reminder email template
- audit event or reminder history table

Frontend tasks:

- `Send reminder` button for overdue/unpaid invoices
- visible `Last reminder sent` state

## Slice 5 — payment receipt download

Target behavior:

- On payment detail/list, download receipt PDF.
- Receipt includes:
  - payment ID
  - invoice ID / invoice number
  - customer
  - paid amount
  - currency
  - method
  - reference number
  - paid date
  - status

Likely home:

- payment-service owns `GET /api/v1/payments/{id}/receipt`.
- frontend payment list/detail exposes `Download receipt`.

## Slice 6 — invoice public/secure link

Target behavior:

- Customer can open secure invoice view without app login.
- Tokenized link with expiry/revocation.
- Record viewed timestamp.

Security requirements:

- random token, not invoice id only
- expiry support
- revoke support
- no access to other org data

## Recommended implementation order

1. Finish/deploy backend PDF download.
2. Add send invoice email/share flow.
3. Add status lifecycle/timeline.
4. Add overdue reminders.
5. Add payment receipt download.
6. Add secure customer invoice link/view tracking.
