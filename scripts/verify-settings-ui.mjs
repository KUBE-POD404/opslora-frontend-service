import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const organizationPage = join(root, "app/(dashboard)/settings/page.tsx")
const profilePage = join(root, "app/(dashboard)/settings/profile/page.tsx")
const sidebar = join(root, "components/app-sidebar.tsx")

assert.ok(existsSync(organizationPage), "organization settings page must exist")
assert.ok(existsSync(profilePage), "profile settings page must exist")

const org = readFileSync(organizationPage, "utf8")
const profile = readFileSync(profilePage, "utf8")
const nav = readFileSync(sidebar, "utf8")

assert.ok(!org.includes("redirect(\"/settings/profile\")"), "settings root must render organization settings, not redirect to profile")
assert.match(org, /Organization Settings/, "organization page should expose an Organization Settings heading")
assert.match(org, /\/settings\/organization/, "organization page should call the organization settings API")
assert.match(org, /\/settings\/feature-flags/, "organization page should call the feature flags API")

for (const field of [
  "legal_name",
  "display_name",
  "logo_url",
  "address",
  "phone",
  "email",
  "website",
  "country",
  "state",
  "tax_id",
  "gstin",
  "tax_registration_type",
  "default_tax_mode",
  "invoice_prefix",
  "next_invoice_sequence",
  "default_due_days",
  "default_invoice_terms",
  "default_invoice_footer",
  "default_invoice_template",
]) {
  assert.ok(org.includes(field), `organization page missing field: ${field}`)
}

for (const capability of [
  "inventory_enabled",
  "gst_invoice_enabled",
  "customer_portal_enabled",
  "online_payments_enabled",
  "multi_warehouse_enabled",
  "advanced_reports_enabled",
]) {
  assert.ok(org.includes(capability), `organization page missing capability toggle: ${capability}`)
}

assert.match(profile, /Profile Settings/, "profile page should remain available")
assert.match(nav, /url: "\/settings"/, "sidebar should keep Organization navigation at /settings")
assert.match(nav, /url: "\/settings\/profile"/, "sidebar should keep Profile navigation at /settings/profile")

console.log("settings UI static contract ok")
