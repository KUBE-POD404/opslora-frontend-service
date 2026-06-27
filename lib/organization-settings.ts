export type OrganizationSettings = {
  organization_id: number
  legal_name: string | null
  display_name: string | null
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  country: string | null
  state: string | null
  tax_id: string | null
  gstin: string | null
  tax_registration_type: string | null
  default_tax_mode: string | null
  invoice_prefix: string
  next_invoice_sequence: number
  default_due_days: number
  default_invoice_terms: string | null
  default_invoice_footer: string | null
  round_off_enabled: boolean
  default_invoice_template: string | null
  inventory_enabled: boolean
  gst_invoice_enabled: boolean
  customer_portal_enabled: boolean
  online_payments_enabled: boolean
  multi_warehouse_enabled: boolean
  advanced_reports_enabled: boolean
  lora_ai_enabled: boolean
  lora_ai_consent_at: string | null
  lora_ai_consent_by_user_id: number | null
}
