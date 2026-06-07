import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const businessPage = join(root, "app/(dashboard)/settings/page.tsx")
const settingsClient = join(root, "app/(dashboard)/settings/_components/organization-settings-client.tsx")
const taxPage = join(root, "app/(dashboard)/settings/tax-profile/page.tsx")
const invoiceDefaultsPage = join(root, "app/(dashboard)/settings/invoice-defaults/page.tsx")
const featureFlagsPage = join(root, "app/(dashboard)/settings/feature-flags/page.tsx")
const portalPage = join(root, "app/(dashboard)/settings/portal/page.tsx")
const profilePage = join(root, "app/(dashboard)/settings/profile/page.tsx")
const sidebar = join(root, "components/app-sidebar.tsx")

assert.ok(existsSync(businessPage), "business profile settings page must exist")
assert.ok(existsSync(settingsClient), "shared organization settings client must exist")
assert.ok(existsSync(taxPage), "tax profile settings page must exist")
assert.ok(existsSync(invoiceDefaultsPage), "invoice defaults settings page must exist")
assert.ok(existsSync(featureFlagsPage), "feature flags settings page must exist")
assert.ok(existsSync(portalPage), "portal settings page must exist")
assert.ok(existsSync(profilePage), "profile settings page must exist")

const business = readFileSync(businessPage, "utf8")
const org = readFileSync(settingsClient, "utf8")
const profile = readFileSync(profilePage, "utf8")
const nav = readFileSync(sidebar, "utf8")

assert.ok(!business.includes("redirect(\"/settings/profile\")"), "settings root must render business profile, not redirect to profile")
assert.match(business, /section="business"/, "settings root should render the Business Profile subpage")
assert.match(org, /Business Profile/, "organization settings client should expose Business Profile")
assert.match(org, /Tax Profile/, "organization settings client should expose Tax Profile")
assert.match(org, /Invoice Defaults/, "organization settings client should expose Invoice Defaults")
assert.match(org, /Feature Flags/, "organization settings client should expose Feature Flags")
assert.match(org, /\/settings\/organization/, "organization settings client should call the organization settings API")
assert.match(org, /\/settings\/feature-flags/, "organization settings client should call the feature flags API")
assert.ok(!org.includes("Tabs"), "settings pages should not use duplicated in-page Tabs navigation")
assert.ok(!org.includes("tablist"), "settings pages should not render duplicated tablist navigation")

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
assert.match(nav, /title: "Business profile"[\s\S]*url: "\/settings"/, "sidebar should keep Business profile navigation at /settings")
assert.match(nav, /url: "\/settings\/tax-profile"/, "sidebar should include Tax profile navigation")
assert.match(nav, /url: "\/settings\/invoice-defaults"/, "sidebar should include Invoice defaults navigation")
assert.match(nav, /url: "\/settings\/feature-flags"/, "sidebar should include Feature flags navigation")
assert.match(nav, /url: "\/settings\/portal"/, "sidebar should include Portal navigation")
assert.match(nav, /url: "\/settings\/profile"/, "sidebar should keep Profile Settings navigation at /settings/profile")

console.log("settings UI static contract ok")
