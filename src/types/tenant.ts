/**
 * Multi-Tenant Entity Definitions for LoanGenius
 *
 * These types define the data model for the multi-tenant white-label architecture.
 * Create these entities in Base44 to enable domain-based tenant resolution.
 */

// ============================================
// TENANT ACCOUNT (Top-Level Customer)
// ============================================
export interface TenantAccount {
  id: string;
  name: string;                          // "Acme Mortgage"
  slug: string;                          // "acme" - for subdomain routing
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  plan_id: string;                       // Reference to subscription plan
  subscription_status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  billing_customer_id?: string;          // Stripe customer ID
  billing_email: string;

  // Limits based on plan
  max_users: number;
  max_deals_per_month: number;
  max_storage_gb: number;

  // Metadata
  created_at: string;
  created_by: string;
  updated_at: string;
  trial_ends_at?: string;
}

// ============================================
// TENANT DOMAIN (Hostname Mapping)
// ============================================
export interface TenantDomain {
  id: string;
  tenant_id: string;                     // FK to TenantAccount
  org_id: string;                        // FK to Organization (may equal tenant_id initially)

  hostname: string;                      // "acme.loangenius.ai" or "portal.acmemortgage.com"
  domain_type: 'subdomain' | 'custom';
  is_primary: boolean;                   // Primary domain for this tenant

  // Verification status
  status: 'pending_dns' | 'pending_ssl' | 'active' | 'failed' | 'removed';
  verification_method: 'cname' | 'txt' | 'http';
  verification_token: string;            // Random token for DNS verification
  verification_record_name: string;      // "_loangenius-verify.acmemortgage.com"
  verification_record_value: string;     // The value they need to set
  target_cname: string;                  // "edge.loangenius.ai" - where CNAME should point

  // SSL
  ssl_provider: 'cloudflare' | 'vercel' | 'aws_acm' | 'letsencrypt' | null;
  ssl_provider_ref?: string;             // External certificate ID
  ssl_expires_at?: string;

  // Error tracking
  last_error?: string;
  last_error_at?: string;
  retry_count: number;

  // Timestamps
  created_at: string;
  verified_at?: string;
  activated_at?: string;
  removed_at?: string;
}

// ============================================
// TENANT BRANDING (White-Label Appearance)
// ============================================
export interface TenantBranding {
  id: string;
  tenant_id: string;

  // Identity
  app_name: string;                      // "Acme Loan Portal" (replaces "LoanGenius")
  company_name: string;
  tagline?: string;

  // Logos
  logo_light_url?: string;               // For light backgrounds
  logo_dark_url?: string;                // For dark backgrounds
  logo_icon_url?: string;                // Square icon/favicon
  favicon_url?: string;

  // Colors (hex)
  primary_color: string;                 // Main brand color
  secondary_color: string;               // Secondary actions
  accent_color: string;                  // Highlights
  background_color: string;              // Page backgrounds
  surface_color: string;                 // Card backgrounds
  text_color: string;                    // Primary text
  text_muted_color: string;              // Secondary text

  // Typography
  font_family: string;                   // "Inter" | "Roboto" | etc.
  font_heading?: string;                 // Different font for headings

  // UI Style
  button_style: 'rounded' | 'pill' | 'sharp';
  border_radius: 'none' | 'sm' | 'md' | 'lg' | 'full';

  // Contact/Support
  support_email: string;
  support_phone?: string;
  support_url?: string;

  // Legal
  nmls_id?: string;
  legal_disclaimer?: string;
  privacy_policy_url?: string;
  terms_url?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================
// TENANT FEATURE FLAG
// ============================================
export interface TenantFeatureFlag {
  id: string;
  tenant_id: string;

  key: string;                           // "white_label" | "docusign" | "ai_assistant" | etc.
  enabled: boolean;

  // Optional configuration for the feature
  config?: Record<string, unknown>;

  // Override reason (for support/sales)
  override_reason?: string;
  overridden_by?: string;

  created_at: string;
  updated_at: string;
}

// Standard feature flags
export const FEATURE_FLAGS = {
  WHITE_LABEL: 'white_label',            // Remove all LoanGenius branding
  CUSTOM_DOMAINS: 'custom_domains',      // Allow custom domain setup
  DOCUSIGN: 'docusign',                  // DocuSign integration
  AI_ASSISTANT: 'ai_assistant',          // AI document processing
  AI_LENDER_MATCH: 'ai_lender_match',    // AI lender matching
  BORROWER_PORTAL: 'borrower_portal',    // Borrower-facing portal
  API_ACCESS: 'api_access',              // API key access
  ADVANCED_REPORTING: 'advanced_reporting',
  BULK_OPERATIONS: 'bulk_operations',
  WEBHOOKS: 'webhooks',
  GOOGLE_SHEETS_SYNC: 'google_sheets_sync',
  GHL_INTEGRATION: 'ghl_integration',
} as const;

// ============================================
// TENANT INTEGRATION CREDENTIAL
// ============================================
export interface TenantIntegrationCredential {
  id: string;
  tenant_id: string;

  provider: 'twilio' | 'sendgrid' | 'resend' | 'docusign' | 'ghl' | 'google' | 'zapier' | 'stripe';

  // Encrypted credentials (NEVER log these)
  credentials_encrypted: string;         // JSON encrypted at rest

  status: 'active' | 'expired' | 'revoked' | 'error';
  last_used_at?: string;
  last_error?: string;

  // Rotation tracking
  rotated_at?: string;
  expires_at?: string;

  created_at: string;
  created_by: string;
}

// ============================================
// TENANT COMMS PROFILE (Email/SMS Identity)
// ============================================
export interface TenantCommsProfile {
  id: string;
  tenant_id: string;

  // Email settings
  email_provider: 'resend' | 'sendgrid' | 'ses';
  email_from_name: string;               // "Acme Mortgage Team"
  email_from_address: string;            // "loans@acmemortgage.com"
  email_reply_to?: string;
  email_domain_verified: boolean;

  // SMS settings
  sms_provider: 'twilio' | null;
  sms_from_number?: string;              // "+15551234567"
  sms_messaging_service_sid?: string;

  // Compliance
  compliance_footer_text?: string;       // Required disclaimer in emails
  unsubscribe_url?: string;

  created_at: string;
  updated_at: string;
}

// ============================================
// TENANT USAGE (For Billing/Quotas)
// ============================================
export interface TenantUsage {
  id: string;
  tenant_id: string;
  period: string;                        // "2024-01" (monthly)

  // Counts
  active_users: number;
  deals_created: number;
  documents_uploaded: number;
  storage_bytes: number;
  api_calls: number;
  ai_requests: number;
  emails_sent: number;
  sms_sent: number;

  // Timestamps
  calculated_at: string;
}

// ============================================
// TENANT CONTEXT (Runtime Resolution)
// ============================================
export interface TenantContext {
  // Resolution status
  ok: boolean;
  error?: string;

  // Identity
  tenant_id: string;
  org_id: string;
  user_id: string;
  user_email: string;

  // Role & permissions
  role: string;
  permissions: string[];

  // Domain info
  resolved_by: 'hostname' | 'membership' | 'token';
  hostname?: string;
  domain_status?: string;

  // Branding & features
  branding: TenantBranding | null;
  feature_flags: Record<string, boolean>;

  // Comms identity
  comms_profile: TenantCommsProfile | null;
}

// ============================================
// DEFAULT VALUES
// ============================================
export const DEFAULT_BRANDING: Partial<TenantBranding> = {
  app_name: 'LoanGenius',
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
  accent_color: '#0891b2',
  background_color: '#f9fafb',
  surface_color: '#ffffff',
  text_color: '#111827',
  text_muted_color: '#6b7280',
  font_family: 'Inter',
  button_style: 'rounded',
  border_radius: 'md',
};

export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  [FEATURE_FLAGS.BORROWER_PORTAL]: true,
  [FEATURE_FLAGS.WHITE_LABEL]: false,
  [FEATURE_FLAGS.CUSTOM_DOMAINS]: false,
  [FEATURE_FLAGS.DOCUSIGN]: false,
  [FEATURE_FLAGS.AI_ASSISTANT]: false,
  [FEATURE_FLAGS.AI_LENDER_MATCH]: false,
  [FEATURE_FLAGS.API_ACCESS]: false,
  [FEATURE_FLAGS.ADVANCED_REPORTING]: false,
  [FEATURE_FLAGS.BULK_OPERATIONS]: false,
  [FEATURE_FLAGS.WEBHOOKS]: false,
  [FEATURE_FLAGS.GOOGLE_SHEETS_SYNC]: true,
  [FEATURE_FLAGS.GHL_INTEGRATION]: false,
};
